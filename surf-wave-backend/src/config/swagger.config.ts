/**
 * @file swagger.config.ts
 * @description Swagger(OpenAPI) API 문서 자동 생성 설정
 *
 * /docs 경로에서 API 문서를 웹 브라우저로 확인할 수 있습니다.
 * 모든 엔드포인트, 요청/응답 DTO, 인증 방식 등이 자동으로 문서화됩니다.
 *
 * 주요 설정:
 * - Firebase Bearer 토큰 인증 스키마 등록
 * - API 태그별 그룹화 (auth, users, spots, sessions 등)
 * - 개발 서버 URL 설정 (http://localhost:3000)
 * - Swagger UI 커스텀 옵션 (테마, 필터, 요청 시간 표시)
 */

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * setupSwagger - Swagger API 문서를 설정하고 NestJS 앱에 마운트하는 함수
 * main.ts의 bootstrap()에서 호출됩니다.
 * @param app - NestJS 애플리케이션 인스턴스
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Surf Wave API')
    .setDescription(
      'The Surf Wave backend API documentation. ' +
        'Provides endpoints for user management, surf spot discovery, ' +
        'session tracking, and media uploads.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Firebase ID token',
        in: 'header',
      },
      'firebase-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('spots', 'Surf spot endpoints')
    .addTag('sessions', 'Surf session endpoints')
    .addTag('uploads', 'File upload endpoints')
    .addTag('health', 'Health check endpoints')
    .addServer('http://localhost:3000', 'Local development')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    customSiteTitle: 'Surf Wave API Docs',
  });
}
