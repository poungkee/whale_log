/**
 * @file spots.service.ts
 * @description 서핑 스팟 서비스 - 스팟 CRUD, 즐겨찾기, 투표 비즈니스 로직
 *
 * 주요 기능:
 * - findAll: 필터(지역/난이도/검색어) + 페이지네이션으로 스팟 목록 조회
 * - findNearby: GPS 좌표 기반 주변 스팟 검색 (Bounding Box 알고리즘)
 * - findById: 스팟 상세 정보 + 즐겨찾기 여부
 * - vote: 오늘의 서핑 컨디션 투표 (하루 1회 제한)
 * - getVoteDistribution: 오늘의 투표 집계 결과
 * - addFavorite / removeFavorite: 즐겨찾기 토글
 */
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
import { Difficulty } from '../../common/enums/difficulty.enum';
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

  async findAll(query: SpotQueryDto, userId?: string) {
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

    // Check favorites for current user (if logged in)
    const favoriteSpotIds = userId ? await this.getUserFavoriteIds(userId) : [];
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

  async findNearby(query: NearbyQueryDto, userId?: string) {
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

    const favoriteSpotIds = userId ? await this.getUserFavoriteIds(userId) : [];
    return spots.map((spot) => ({
      ...spot,
      isFavorited: favoriteSpotIds.includes(spot.id),
    }));
  }

  async findById(spotId: string, userId?: string) {
    const spot = await this.spotRepository.findOne({
      where: { id: spotId, isActive: true },
    });
    if (!spot) {
      throw new NotFoundException('Spot not found');
    }

    let isFavorited = false;
    if (userId) {
      const favorite = await this.favoriteRepository.findOne({
        where: { spotId, userId },
      });
      isFavorited = !!favorite;
    }

    return { ...spot, isFavorited };
  }

  async getVoteDistribution(spotId: string, userId?: string) {
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

    votes.forEach((v: { voteType: string; count: string }) => {
      const count = parseInt(v.count, 10);
      const key = v.voteType.toLowerCase() as 'perfect' | 'flat' | 'mediocre';
      distribution[key] = count;
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

  /** 활성 상태(isActive=true)인 스팟 목록 조회 (크론 예보 수집용) */
  async findAllActive(): Promise<Spot[]> {
    return this.spotRepository.find({
      where: { isActive: true },
      select: ['id', 'name', 'latitude', 'longitude'],
    });
  }

  /** 대시보드용: 레벨에 따라 적합한 난이도의 활성 스팟 조회 */
  async findAllActiveForDashboard(level?: Difficulty): Promise<Spot[]> {
    const qb = this.spotRepository
      .createQueryBuilder('spot')
      .select([
        'spot.id',
        'spot.name',
        'spot.latitude',
        'spot.longitude',
        'spot.difficulty',
        'spot.region',
        'spot.description',
        // v1.3 계산 로직에 필요한 스팟 고정 속성
        'spot.breakType',             // 해저 지형 (beach_break, reef_break 등)
        'spot.bestSwellDirection',    // 최적 스웰 방향 (S, SW 등)
        'spot.bestSwellSpreadDeg',    // 스웰 허용 범위 (도)
        'spot.coastFacingDeg',        // 해안이 바라보는 바다 방향 (도)
        'spot.season',                // 최적 시즌
        'spot.optimalWaveMin',        // [override] 최적 파고 하한
        'spot.optimalWaveMax',        // [override] 최적 파고 상한
        'spot.tolerableWaveMin',      // [override] 허용 파고 하한
        'spot.tolerableWaveMax',      // [override] 허용 파고 상한
      ])
      .where('spot.isActive = :isActive', { isActive: true });

    if (level === Difficulty.BEGINNER) {
      qb.andWhere('spot.difficulty = :diff', { diff: Difficulty.BEGINNER });
    } else if (level === Difficulty.INTERMEDIATE) {
      qb.andWhere('spot.difficulty IN (:...diffs)', {
        diffs: [Difficulty.BEGINNER, Difficulty.INTERMEDIATE],
      });
    } else if (level === Difficulty.ADVANCED) {
      qb.andWhere('spot.difficulty IN (:...diffs)', {
        diffs: [Difficulty.BEGINNER, Difficulty.INTERMEDIATE, Difficulty.ADVANCED],
      });
    }
    // EXPERT or undefined → return all active spots

    return qb.orderBy('spot.name', 'ASC').getMany();
  }

  private async getUserFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      select: ['spotId'],
    });
    return favorites.map((f) => f.spotId);
  }
}
