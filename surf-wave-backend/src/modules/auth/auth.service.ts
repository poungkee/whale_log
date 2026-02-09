/**
 * @file auth.service.ts
 * @description 인증 서비스 - 회원가입, 로그인, 회원탈퇴 비즈니스 로직
 *
 * Firebase ID 토큰을 검증하고 서비스 자체 사용자 DB와 연동합니다.
 * 회원가입 시 Firebase UID를 기반으로 사용자를 생성하고,
 * 로그인 시 Firebase 토큰을 검증한 후 사용자 정보를 반환합니다.
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { FIREBASE_ADMIN } from '../../config/firebase.config';
import * as admin from 'firebase-admin';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    @Inject(FIREBASE_ADMIN) private firebaseAdmin: admin.app.App | null,
  ) {}

  /**
   * register - 회원가입 처리
   * 1. Firebase 토큰 검증으로 UID/이메일 추출
   * 2. 기존 가입 여부 확인 (중복 가입 방지)
   * 3. 닉네임 중복 확인
   * 4. 새 사용자 생성 및 저장
   */
  async register(registerDto: RegisterDto) {
    const { firebaseToken, nickname, provider } = registerDto;

    // Verify Firebase token
    const decodedToken = await this.verifyToken(firebaseToken);

    // Check if user already exists
    const existingUser = await this.usersService.findByFirebaseUid(decodedToken.uid);
    if (existingUser) {
      throw new ConflictException('User already registered');
    }

    // Check nickname availability
    const nicknameExists = await this.usersService.findByNickname(nickname);
    if (nicknameExists) {
      throw new ConflictException('Nickname already taken');
    }

    // Create user
    const user = await this.usersService.create({
      firebaseUid: decodedToken.uid,
      email: decodedToken.email || '',
      nickname,
      provider,
    });

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * login - 로그인 처리
   * 1. Firebase 토큰 검증
   * 2. DB에서 사용자 조회 (미가입 시 에러)
   * 3. 정지 상태 확인
   * 4. 마지막 로그인 시각 갱신
   * 5. 사용자 프로필 정보 반환
   */
  async login(loginDto: LoginDto) {
    const { firebaseToken } = loginDto;

    const decodedToken = await this.verifyToken(firebaseToken);

    const user = await this.usersService.findByFirebaseUid(decodedToken.uid);
    if (!user) {
      throw new UnauthorizedException('User not registered');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      surfLevel: user.surfLevel,
      notificationsEnabled: user.notificationsEnabled,
    };
  }

  /** withdraw - 회원탈퇴 (소프트 삭제 - deleted_at에 삭제 시각 기록) */
  async withdraw(userId: string) {
    await this.usersService.softDelete(userId);
    return { message: 'Account deleted successfully' };
  }

  /**
   * verifyToken - Firebase ID 토큰 검증 (내부 헬퍼 메서드)
   * Firebase Admin SDK로 토큰을 디코딩하여 UID, 이메일 등을 추출합니다.
   * Firebase가 설정되지 않은 개발 환경에서는 목(mock) 토큰을 반환합니다.
   */
  private async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.firebaseAdmin) {
      // Dev mode mock - use token value as deterministic UID
      this.logger.warn('Firebase not configured, using mock token');
      return {
        uid: 'mock-uid-' + token,
        email: token,
      } as admin.auth.DecodedIdToken;
    }

    try {
      return await this.firebaseAdmin.auth().verifyIdToken(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
