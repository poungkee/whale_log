/**
 * @file auth.module.ts
 * @description 인증 모듈 - 회원가입, 로그인, 소셜 로그인, 회원탈퇴 기능 제공
 *
 * 이 모듈이 제공하는 기능:
 * - 이메일/비밀번호 기반 일반 회원가입 및 로그인
 * - Google OAuth2 소셜 로그인 (ID 토큰 검증)
 * - Kakao OAuth2 소셜 로그인 (액세스 토큰으로 사용자 정보 조회)
 * - JWT 토큰 발급 및 검증
 * - 회원탈퇴 (소프트 삭제)
 *
 * 의존성:
 * - UsersModule: 사용자 CRUD (이메일/닉네임 조회, 생성, 수정)
 * - HttpModule: 외부 API 호출 (Google tokeninfo, Kakao user/me)
 * - JwtModule: JWT 토큰 생성 및 검증
 * - ConfigModule: JWT_SECRET 환경 변수 읽기
 *
 * 외부 공개 (exports):
 * - AuthService: 다른 모듈에서 인증 로직 사용 가능
 * - JwtModule: FirebaseAuthGuard(글로벌 가드)에서 JwtService 주입 가능
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    /** ConfigModule - 환경변수 읽기 (KAKAO_REST_API_KEY 등) */
    ConfigModule,

    /** UsersModule - 사용자 조회/생성/수정 서비스 사용 */
    UsersModule,

    /** HttpModule - Google/Kakao OAuth API 호출을 위한 HTTP 클라이언트 */
    HttpModule,

    /**
     * JwtModule - JWT 토큰 생성 및 검증
     * - registerAsync: ConfigService에서 환경변수를 비동기로 읽어 설정
     * - secret: JWT 서명/검증에 사용할 비밀키 (환경변수 JWT_SECRET)
     * - signOptions.expiresIn: 토큰 유효기간 7일
     * - 개발 환경에서는 기본값 'surfwave-jwt-secret-dev-2026' 사용
     */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'surfwave-jwt-secret-dev-2026'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [
    AuthService,  // 다른 모듈에서 인증 관련 로직 재사용 가능
    JwtModule,    // app.module.ts의 글로벌 가드(FirebaseAuthGuard)에서 JwtService 주입 가능
  ],
})
export class AuthModule {}
