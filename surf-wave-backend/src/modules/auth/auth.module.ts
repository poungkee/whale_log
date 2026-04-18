/**
 * @file auth.module.ts
 * @description 인증 모듈 - 회원가입, 로그인, 소셜 로그인, 비밀번호 찾기, 회원탈퇴 기능 제공
 *
 * 이 모듈이 제공하는 기능:
 * - 이메일/비밀번호 기반 일반 회원가입 및 로그인 (아이디 기반)
 * - Google/Kakao 소셜 로그인
 * - JWT 토큰 발급 및 검증
 * - 비밀번호 찾기 (이메일 인증코드 발송 → 새 비밀번호 설정)
 * - 아이디 중복 확인
 * - 회원탈퇴 (소프트 삭제)
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MailerModule } from '@nestjs-modules/mailer';
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

    /**
     * MailerModule - 비밀번호 찾기 인증코드 이메일 발송
     * Gmail SMTP + App Password 방식 사용
     * 환경변수: MAIL_USER, MAIL_PASS
     */
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: configService.get<string>('MAIL_USER', 'whale.log.story@gmail.com'),
            pass: configService.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: '"Whale Log" <whale.log.story@gmail.com>',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    /** Redis 클라이언트 - 인증코드 임시 저장 (5분 TTL) */
    RedisProvider,
  ],
  exports: [
    AuthService,
    JwtModule,
  ],
})
export class AuthModule {}
