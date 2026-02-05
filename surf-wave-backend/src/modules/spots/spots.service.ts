import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spot } from './entities/spot.entity';
import { SpotFavorite } from './entities/spot-favorite.entity';
import { SpotVote } from './entities/spot-vote.entity';
import { SpotQueryDto } from './dto/spot-query.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { VoteType } from '../../common/enums/vote-type.enum';
import { getBoundingBox } from '../../common/utils/geo.util';
import { formatDate } from '../../common/utils/date.util';

@Injectable()
export class SpotsService {
  constructor(
    @InjectRepository(Spot)
    private readonly spotRepository: Repository<Spot>,
    @InjectRepository(SpotFavorite)
    private readonly favoriteRepository: Repository<SpotFavorite>,
    @InjectRepository(SpotVote)
    private readonly voteRepository: Repository<SpotVote>,
  ) {}

  async findAll(query: SpotQueryDto, userId: string) {
    const { region, difficulty, search, page = 1, limit = 20 } = query;

    const qb = this.spotRepository
      .createQueryBuilder('spot')
      .where('spot.isActive = :isActive', { isActive: true });

    if (region) {
      qb.andWhere('spot.region = :region', { region });
    }
    if (difficulty) {
      qb.andWhere('spot.difficulty = :difficulty', { difficulty });
    }
    if (search) {
      qb.andWhere('spot.name ILIKE :search', { search: `%${search}%` });
    }

    const [spots, total] = await qb
      .orderBy('spot.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Check favorites for current user
    const favoriteSpotIds = await this.getUserFavoriteIds(userId);
    const spotsWithFavorite = spots.map((spot) => ({
      ...spot,
      isFavorited: favoriteSpotIds.includes(spot.id),
    }));

    return {
      data: spotsWithFavorite,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async findNearby(query: NearbyQueryDto, userId: string) {
    const { lat, lng, radius = 50 } = query;
    const bounds = getBoundingBox(lat, lng, radius);

    const spots = await this.spotRepository
      .createQueryBuilder('spot')
      .where('spot.isActive = :isActive', { isActive: true })
      .andWhere('spot.latitude BETWEEN :minLat AND :maxLat', {
        minLat: bounds.minLat,
        maxLat: bounds.maxLat,
      })
      .andWhere('spot.longitude BETWEEN :minLon AND :maxLon', {
        minLon: bounds.minLon,
        maxLon: bounds.maxLon,
      })
      .getMany();

    const favoriteSpotIds = await this.getUserFavoriteIds(userId);
    return spots.map((spot) => ({
      ...spot,
      isFavorited: favoriteSpotIds.includes(spot.id),
    }));
  }

  async findById(spotId: string, userId: string) {
    const spot = await this.spotRepository.findOne({
      where: { id: spotId, isActive: true },
    });
    if (!spot) {
      throw new NotFoundException('Spot not found');
    }

    const isFavorited = await this.favoriteRepository.findOne({
      where: { spotId, userId },
    });

    return { ...spot, isFavorited: !!isFavorited };
  }

  async getVoteDistribution(spotId: string, userId: string) {
    const today = formatDate(new Date());

    const votes = await this.voteRepository
      .createQueryBuilder('vote')
      .select('vote.voteType', 'voteType')
      .addSelect('COUNT(*)', 'count')
      .where('vote.spotId = :spotId', { spotId })
      .andWhere('vote.votedDate = :today', { today })
      .groupBy('vote.voteType')
      .getRawMany();

    const distribution = {
      perfect: 0,
      flat: 0,
      mediocre: 0,
      totalVotes: 0,
    };

    votes.forEach((v) => {
      const count = parseInt(v.count, 10);
      distribution[v.voteType.toLowerCase()] = count;
      distribution.totalVotes += count;
    });

    const userVote = await this.voteRepository.findOne({
      where: { spotId, userId, votedDate: today as any },
    });

    return {
      spotId,
      date: today,
      ...distribution,
      userVote: userVote?.voteType || null,
    };
  }

  async vote(spotId: string, userId: string, voteType: VoteType) {
    const today = formatDate(new Date());

    const existingVote = await this.voteRepository.findOne({
      where: { spotId, userId, votedDate: today as any },
    });

    if (existingVote) {
      throw new BadRequestException('Already voted today for this spot');
    }

    const vote = this.voteRepository.create({
      spotId,
      userId,
      voteType,
      votedDate: today,
    });

    await this.voteRepository.save(vote);
    return { message: 'Vote recorded successfully' };
  }

  async getFavorites(userId: string) {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      relations: ['spot'],
      order: { createdAt: 'DESC' },
    });

    return favorites.map((f) => ({ ...f.spot, isFavorited: true }));
  }

  async addFavorite(spotId: string, userId: string) {
    const spot = await this.spotRepository.findOne({ where: { id: spotId } });
    if (!spot) {
      throw new NotFoundException('Spot not found');
    }

    const existing = await this.favoriteRepository.findOne({
      where: { spotId, userId },
    });
    if (existing) {
      throw new ConflictException('Already favorited');
    }

    const favorite = this.favoriteRepository.create({ spotId, userId });
    await this.favoriteRepository.save(favorite);
    return { message: 'Added to favorites' };
  }

  async removeFavorite(spotId: string, userId: string) {
    const result = await this.favoriteRepository.delete({ spotId, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Favorite not found');
    }
    return { message: 'Removed from favorites' };
  }

  private async getUserFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      select: ['spotId'],
    });
    return favorites.map((f) => f.spotId);
  }
}
