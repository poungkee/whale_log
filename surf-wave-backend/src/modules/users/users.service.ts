/**
 * @file users.service.ts
 * @description 사용자 서비스 - 사용자 CRUD 및 프로필 관리 비즈니스 로직
 *
 * User 엔티티에 대한 모든 데이터베이스 작업을 담당합니다.
 * AuthService에서 사용자 생성/조회에 활용되며,
 * 다른 모듈에서도 사용자 정보 조회를 위해 사용됩니다.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SocialProvider } from '../../common/enums/social-provider.enum';

/** 사용자 생성 시 필요한 데이터 인터페이스 (내부용) */
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

  /** create - 새 사용자 생성 (회원가입 시 AuthService에서 호출) */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  /** findById - ID로 사용자 조회 (없으면 NotFoundException) */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /** findByFirebaseUid - Firebase UID로 사용자 조회 (로그인/회원가입 시 중복 확인) */
  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { firebaseUid } });
  }

  /** findByEmail - 이메일로 사용자 조회 */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /** findByNickname - 닉네임으로 사용자 조회 (닉네임 중복 확인에 사용) */
  async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { nickname } });
  }

  /** update - 사용자 정보 부분 업데이트 (프로필 수정) */
  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    return this.findById(id);
  }

  /** updateFcmToken - FCM 푸시 알림 토큰 업데이트 */
  async updateFcmToken(id: string, fcmToken: string): Promise<void> {
    await this.userRepository.update(id, { fcmToken });
  }

  /** updateLastLogin - 마지막 로그인 시각 갱신 */
  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  /** softDelete - 사용자 소프트 삭제 (회원탈퇴 시 deleted_at 설정) */
  async softDelete(id: string): Promise<void> {
    await this.userRepository.softDelete(id);
  }

  /** getStats - 사용자 활동 통계 조회 (다이어리 수, 게시글 수, 서핑 일수 등) - TODO: 구현 필요 */
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

  /** getPublicProfile - 다른 사용자에게 공개되는 프로필 정보만 반환 (비공개 정보 제외) */
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
