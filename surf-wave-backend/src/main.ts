/**
 * @file main.ts
 * @description 서프 웨이브 백엔드 애플리케이션의 진입점 (Entry Point)
 *
 * NestJS 애플리케이션을 초기화하고 부트스트랩하는 파일입니다.
 * - 글로벌 API 접두사 설정 (/api/v1)
 * - CORS (Cross-Origin Resource Sharing) 허용 설정
 * - 요청 데이터 유효성 검증 파이프라인 설정
 * - Swagger API 문서 자동 생성 설정
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

/**
 * bootstrap - 애플리케이션 부트스트랩 함수
 *
 * NestJS 애플리케이션을 생성하고 모든 글로벌 설정을 적용한 후 서버를 시작합니다.
 * 환경 변수에서 포트(PORT)와 API 접두사(API_PREFIX)를 읽어옵니다.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  /** AppModule을 기반으로 NestJS 애플리케이션 인스턴스 생성 */
  const app = await NestFactory.create(AppModule);

  /** ConfigService를 통해 환경 변수에서 설정값 조회 */
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');

  /**
   * 글로벌 API 접두사 설정
   * 모든 엔드포인트 URL 앞에 '/api/v1'이 자동으로 붙습니다.
   * 예: /spots → /api/v1/spots
   */
  app.setGlobalPrefix(apiPrefix);

  /**
   * CORS (Cross-Origin Resource Sharing) 설정
   * 프론트엔드(모바일 앱, 웹)에서 이 API 서버로 교차 출처 요청을 허용합니다.
   * - origin: true → 모든 출처 허용
   * - credentials: true → 쿠키/인증 헤더 포함 요청 허용
   */
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  /**
   * 글로벌 유효성 검증 파이프 (ValidationPipe) 설정
   * 모든 API 요청의 DTO(Data Transfer Object)에 대해 자동으로 유효성 검증을 수행합니다.
   * - whitelist: DTO에 정의되지 않은 속성은 자동으로 제거
   * - forbidNonWhitelisted: DTO에 없는 속성이 전달되면 400 에러 반환
   * - transform: 요청 데이터를 DTO 클래스 인스턴스로 자동 변환
   * - enableImplicitConversion: 문자열 → 숫자 등 타입 자동 변환
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
   * Swagger API 문서 설정
   * /docs 경로에서 API 문서를 확인할 수 있습니다.
   */
  setupSwagger(app);

  /** 지정된 포트에서 HTTP 서버 시작 */
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}${apiPrefix}`);
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
