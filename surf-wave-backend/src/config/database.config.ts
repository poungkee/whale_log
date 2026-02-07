/**
 * @file database.config.ts
 * @description PostgreSQL 데이터베이스 연결 설정
 *
 * TypeORM을 사용하여 PostgreSQL 데이터베이스에 연결하기 위한 설정을 정의합니다.
 *
 * 환경 변수:
 * - DB_HOST: 데이터베이스 호스트 (기본값: localhost)
 * - DB_PORT: 데이터베이스 포트 (기본값: 5432)
 * - DB_USERNAME: 데이터베이스 사용자명 (기본값: surfwave)
 * - DB_PASSWORD: 데이터베이스 비밀번호 (기본값: surfwave123)
 * - DB_DATABASE: 데이터베이스명 (기본값: surfwave)
 * - DB_POOL_SIZE: 커넥션 풀 최대 크기 (기본값: 20)
 *
 * 환경별 동작 차이:
 * - 개발 환경: synchronize=true (엔티티 변경 시 DB 스키마 자동 동기화), SQL 로그 출력
 * - 프로덕션: synchronize=false (마이그레이션으로만 스키마 변경), SSL 활성화
 */

import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * getDatabaseConfig - TypeORM 데이터베이스 연결 설정을 반환하는 팩토리 함수
 * AppModule의 TypeOrmModule.forRootAsync()에서 호출됩니다.
 */
export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'surfwave'),
    password: configService.get<string>('DB_PASSWORD', 'surfwave123'),
    database: configService.get<string>('DB_DATABASE', 'surfwave'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: !isProduction,
    logging: !isProduction,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    migrationsRun: isProduction,
    extra: {
      max: configService.get<number>('DB_POOL_SIZE', 20),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    },
  };
};
