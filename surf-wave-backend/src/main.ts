/**
 * @file main.ts
 * @description 서프 웨이브 백엔드 애플리케이션의 진입점 (Entry Point)
 *
 * NestJS 애플리케이션을 초기화하고 부트스트랩하는 파일입니다.
 * - 프로덕션 환경변수 검증 (보안 필수값 누락 시 시작 차단)
 * - Helmet 보안 헤더 설정 (XSS, 클릭재킹, MIME 스니핑 방지)
 * - CORS 화이트리스트 기반 출처 제한
 * - 요청 데이터 유효성 검증 파이프라인 설정
 * - Swagger API 문서 (개발 환경에서만 활성화)
 */

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { validateProductionEnv } from './config/defaults';
import { BadgesService } from './modules/badges/badges.service';

/**
 * bootstrap - 애플리케이션 부트스트랩 함수
 *
 * NestJS 애플리케이션을 생성하고 모든 글로벌 설정을 적용한 후 서버를 시작합니다.
 * 프로덕션 환경에서는 필수 환경변수 검증 후 보안 설정을 강화합니다.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  /** 프로덕션 환경변수 검증 - 필수 보안 값 누락 시 앱 시작 차단 */
  validateProductionEnv();

  /** AppModule을 기반으로 NestJS 애플리케이션 인스턴스 생성 (Express 어댑터) */
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /**
   * 정적 파일 서빙 — 업로드된 이미지를 /uploads/ 경로로 접근 가능하게
   * S3 미설정 시 로컬 파일 시스템에 저장된 이미지를 서빙
   * 예: /uploads/userId/timestamp-uuid.jpg → {cwd}/uploads/userId/timestamp-uuid.jpg
   */
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  /** ConfigService를 통해 환경 변수에서 설정값 조회 */
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  /**
   * 글로벌 API 접두사 설정
   * 모든 엔드포인트 URL 앞에 '/api/v1'이 자동으로 붙습니다.
   */
  app.setGlobalPrefix(apiPrefix);

  /**
   * Helmet 보안 헤더 설정
   * - X-Content-Type-Options: nosniff (MIME 스니핑 방지)
   * - X-Frame-Options: DENY (클릭재킹 방지)
   * - X-XSS-Protection (XSS 필터 활성화)
   * - Strict-Transport-Security (HTTPS 강제 - 프로덕션)
   * - Content-Security-Policy (스크립트/리소스 출처 제한)
   */
  app.use(helmet({
    /** 프로덕션에서는 HSTS 활성화 (1년간 HTTPS 강제) */
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    /** CSP는 API 서버이므로 기본 설정 사용 */
    contentSecurityPolicy: isProduction ? undefined : false,
  }));

  /**
   * CORS (Cross-Origin Resource Sharing) 설정
   * - 개발 환경: localhost 허용
   * - 프로덕션: ALLOWED_ORIGINS 환경변수에 지정된 도메인만 허용
   * - credentials: true → 쿠키/인증 헤더 포함 요청 허용
   */
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS');
  app.enableCors({
    origin: isProduction
      ? (allowedOrigins ? allowedOrigins.split(',').map(o => o.trim()) : false)
      : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  /**
   * 글로벌 유효성 검증 파이프 (ValidationPipe) 설정
   * - whitelist: DTO에 정의되지 않은 속성은 자동으로 제거
   * - forbidNonWhitelisted: DTO에 없는 속성이 전달되면 400 에러 반환
   * - transform: 요청 데이터를 DTO 클래스 인스턴스로 자동 변환
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  /**
   * Swagger API 문서 설정 - 개발 환경에서만 활성화
   * 프로덕션에서는 API 스키마 노출 방지를 위해 비활성화
   */
  if (!isProduction) {
    setupSwagger(app);
    logger.log(`Swagger documentation available at: http://localhost:${port}/docs`);
  }

  /** 뱃지 시드 — 앱 시작 시 badges 테이블에 정의 삽입 (없는 것만) */
  const badgesService = app.get(BadgesService);
  await badgesService.seedBadges();

  /** 지정된 포트에서 HTTP 서버 시작 */
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}${apiPrefix}`);
  logger.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
}

bootstrap();
