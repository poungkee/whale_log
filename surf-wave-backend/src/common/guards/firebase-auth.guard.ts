/**
 * @file firebase-auth.guard.ts
 * @description Firebase 인증 가드 - JWT 토큰 검증을 통한 API 접근 제어
 *
 * 모든 API 요청에 대해 Firebase ID 토큰을 검증합니다.
 * Authorization 헤더에서 "Bearer <token>" 형식으로 전달된 토큰을 추출하고
 * Firebase Admin SDK를 사용하여 토큰의 유효성을 검증합니다.
 *
 * 동작 흐름:
 * 1. @Public() 데코레이터가 있는 엔드포인트는 인증을 건너뜀
 * 2. Authorization 헤더에서 Bearer 토큰 추출
 * 3. Firebase Admin SDK로 토큰 검증 (verifyIdToken)
 * 4. 검증 성공 시 request.firebaseUser에 디코딩된 토큰 정보 저장
 * 5. 검증 실패 시 401 Unauthorized 에러 반환
 *
 * 개발 모드: Firebase가 초기화되지 않은 경우 더미 사용자(dev-user)로 인증 우회
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { FIREBASE_ADMIN } from '../../config/firebase.config';
import * as admin from 'firebase-admin';

/**
 * @class FirebaseAuthGuard
 * @description Firebase ID 토큰을 검증하여 인증된 사용자만 API에 접근할 수 있도록 제어하는 가드
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject(FIREBASE_ADMIN) private firebaseAdmin: admin.app.App | null,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split('Bearer ')[1];

    if (!this.firebaseAdmin) {
      this.logger.warn('Firebase Admin not initialized, skipping auth in dev mode');
      // For development without Firebase
      request.user = { uid: 'dev-user', email: 'dev@example.com' };
      return true;
    }

    try {
      const decodedToken = await this.firebaseAdmin.auth().verifyIdToken(token);
      request.firebaseUser = decodedToken;
      return true;
    } catch (error) {
      this.logger.error(`Token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
