/**
 * @file auth.module.ts
 * @description 인증(Authentication) 모듈
 *
 * Firebase 기반 사용자 인증을 처리하는 모듈입니다.
 * - 회원가입 (소셜 로그인 → Firebase 토큰 → 서비스 유저 생성)
 * - 로그인 (Firebase 토큰 검증 → 유저 정보 반환)
 * - 회원탈퇴 (소프트 삭제)
 *
 * UsersModule을 import하여 사용자 CRUD 기능을 활용합니다.
 * FirebaseProvider를 통해 Firebase Admin SDK를 주입받습니다.
 */
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { FirebaseProvider } from '../../config/firebase.config';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [FirebaseProvider, AuthService],
  exports: [AuthService, FirebaseProvider],
})
export class AuthModule {}
