/**
 * @file auth.module.ts
 * @description 인증 모듈 - 회원가입, 로그인, 소셜 로그인, 비밀번호 찾기, 회원탈퇴
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { DEFAULT_JWT_SECRET } from '../../config/defaults';
import { RedisProvider } from '../../config/redis.config';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    HttpModule,

    /** JwtModule - JWT 토큰 생성 및 검증 (7일 만료) */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', DEFAULT_JWT_SECRET),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    /** Redis 클라이언트 - 인증코드 임시 저장 (5분 TTL) */
    RedisProvider,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
