import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SocialProvider } from '../../common/enums/social-provider.enum';

interface CreateUserDto {
  firebaseUid: string;
  email: string;
  nickname: string;
  provider?: SocialProvider;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { firebaseUid } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { nickname } });
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    return this.findById(id);
  }

  async updateFcmToken(id: string, fcmToken: string): Promise<void> {
    await this.userRepository.update(id, { fcmToken });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepository.softDelete(id);
  }

  async getStats(userId: string): Promise<{
    totalDiaries: number;
    totalPosts: number;
    totalComments: number;
    totalFavoriteSpots: number;
    surfDaysThisMonth: number;
    surfDaysThisYear: number;
  }> {
    // TODO: Implement actual stats calculation with relations
    return {
      totalDiaries: 0,
      totalPosts: 0,
      totalComments: 0,
      totalFavoriteSpots: 0,
      surfDaysThisMonth: 0,
      surfDaysThisYear: 0,
    };
  }

  async getPublicProfile(userId: string): Promise<{
    id: string;
    nickname: string;
    bio: string | null;
    avatarUrl: string | null;
    surfLevel: string | null;
    createdAt: Date;
  }> {
    const user = await this.findById(userId);
    return {
      id: user.id,
      nickname: user.nickname,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      surfLevel: user.surfLevel,
      createdAt: user.createdAt,
    };
  }
}
