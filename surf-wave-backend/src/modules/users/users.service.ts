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
  username?: string | null;
  firebaseUid?: string | null;
  email: string;
  passwordHash?: string | null;
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

  /**
   * findByEmail - 이메일로 사용자 조회 (SEC-9 수정: 필요 필드만 선택적 조회)
   *
   * 기존 문제: select 없이 전체 필드 조회 → passwordHash가 항상 메모리에 로드됨
   * 수정: 호출 목적에 따라 두 가지 오버로드 제공
   *   - withPassword=false (기본): 인증 불필요한 조회 (중복 확인 등)
   *   - withPassword=true: 로그인 시 비밀번호 비교가 필요한 조회
   *
   * @param email - 조회할 이메일 주소
   * @param withPassword - true이면 passwordHash 포함 반환 (로그인용, 기본 false)
   */
  async findByEmail(email: string, withPassword = false): Promise<User | null> {
    if (withPassword) {
      /**
       * 로그인 시 사용 — passwordHash 포함 조회
       * bcrypt.compare에 필요한 passwordHash + 인증 처리에 필요한 필드만 선택
       */
      return this.userRepository.findOne({
        where: { email },
        select: ['id', 'email', 'passwordHash', 'username', 'role', 'isSuspended', 'provider', 'avatarUrl', 'notificationsEnabled'],
      });
    }

    /**
     * 중복 확인 등 일반 조회 — passwordHash 제외
     * 불필요한 민감 데이터를 메모리에 로드하지 않음
     */
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'username', 'role', 'isSuspended', 'firebaseUid', 'provider', 'avatarUrl', 'notificationsEnabled'],
    });
  }

  /** findByUsername - 아이디로 사용자 조회 (로그인 및 아이디 중복 확인에 사용) */
  async findByUsername(username: string, withPassword = false): Promise<User | null> {
    if (withPassword) {
      /** 비밀번호 해시까지 포함해서 조회 (로그인 시) */
      return this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password_hash')
        .where('user.username = :username', { username })
        .andWhere('user.deleted_at IS NULL')
        .getOne();
    }
    return this.userRepository.findOne({ where: { username } });
  }

  /**
   * 구글 가입자용 임시 username 생성 - "서퍼1", "서퍼2"...
   *
   * PostgreSQL Sequence 사용 (google_temp_username_seq) — 동시성 안전.
   * 시퀀스가 없으면 자동 생성 (운영 DB에서 한 번만 실행).
   */
  async nextGoogleTempUsername(): Promise<string> {
    /** 시퀀스가 없으면 생성 — IF NOT EXISTS로 멱등성 보장 */
    await this.userRepository.query(
      `CREATE SEQUENCE IF NOT EXISTS google_temp_username_seq START 1`,
    );
    const result = await this.userRepository.query(
      `SELECT nextval('google_temp_username_seq')::int as seq`,
    );
    const num = result[0]?.seq ?? 1;
    return `서퍼${num}`;
  }

  /**
   * 사용 가능한 username 찾기 - base 그대로 사용 가능하면 그대로, 충돌 시 suffix 부여
   *
   * 카카오 가입 시 닉네임 자동 저장 위해 사용.
   * 예) "포웅" 충돌 시 → "포웅1", "포웅2", ...
   * 최대 15자 제한이라 base가 길면 자르고 시도.
   */
  async findAvailableUsername(base: string): Promise<string> {
    /** 정규식에 안 맞는 문자 제거 후 최대 13자로 자름 (suffix 2자리 여유) */
    const sanitized = base.replace(/[^a-zA-Z0-9_가-힣]/g, '').slice(0, 13);

    /** sanitize 결과 2자 미만이면 fallback (카카오에서 닉네임이 특수문자뿐인 경우) */
    if (sanitized.length < 2) {
      return this.nextGoogleTempUsername();
    }

    /** base 그대로 사용 가능? */
    const exists = await this.findByUsername(sanitized);
    if (!exists) return sanitized;

    /** 1~999 까지 suffix 시도 */
    for (let i = 1; i <= 999; i++) {
      const candidate = `${sanitized}${i}`.slice(0, 15);
      const c = await this.findByUsername(candidate);
      if (!c) return candidate;
    }

    /** 999까지도 충돌 시 시퀀스 fallback (사실상 거의 발생 안 함) */
    return this.nextGoogleTempUsername();
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

  /**
   * sanitizeUser - 사용자 응답에서 민감 정보 제거
   *
   * passwordHash, fcmToken 등 클라이언트에 노출되면 안 되는 필드를 제거합니다.
   * GET /users/me, PATCH /users/me 응답에 사용됩니다.
   *
   * @param user - DB에서 조회한 User 엔티티 (모든 필드 포함)
   * @returns 민감 정보가 제거된 안전한 사용자 데이터
   */
  sanitizeUser(user: User): {
    id: string;
    username: string | null;
    email: string;
    avatarUrl: string | null;
    role: string;
    surfLevel: string | null;
    boardType: string;
    provider: string | null;
    notificationsEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      surfLevel: user.surfLevel,
      boardType: user.boardType ?? 'UNSET',
      provider: user.provider,
      notificationsEnabled: user.notificationsEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /** getPublicProfile - 다른 사용자에게 공개되는 프로필 정보만 반환 (비공개 정보 제외) */
  async getPublicProfile(userId: string): Promise<{
    id: string;
    username: string | null;
    avatarUrl: string | null;
    surfLevel: string | null;
    createdAt: Date;
  }> {
    const user = await this.findById(userId);
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      surfLevel: user.surfLevel,
      createdAt: user.createdAt,
    };
  }
}
