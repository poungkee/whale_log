/**
 * @file redis.config.ts
 * @description Redis 캐시 서버 설정 및 프로바이더
 *
 * Redis를 캐시 저장소로 사용하여 자주 조회되는 데이터의 응답 속도를 향상시킵니다.
 * 주요 캐시 대상:
 * - 서핑 스팟 목록 (10분 TTL)
 * - 파도 예보 데이터 (5분 TTL)
 * - 사용자 프로필 정보 (1시간 TTL)
 *
 * 환경 변수:
 * - REDIS_HOST: Redis 서버 호스트 (기본값: localhost)
 * - REDIS_PORT: Redis 서버 포트 (기본값: 6379)
 *
 * 연결 실패 시 최대 3회 재시도하며, 이벤트 핸들러로 연결 상태를 로깅합니다.
 */

import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Redis 클라이언트 DI 토큰 - @Inject(REDIS_CLIENT)로 주입받을 때 사용 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/** Redis 연결 설정 인터페이스 */
export interface RedisConfig {
  host: string;
  port: number;
}

/** 환경 변수에서 Redis 설정값을 읽어오는 팩토리 함수 */
export const getRedisConfig = (configService: ConfigService): RedisConfig => {
  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
  };
};

/**
 * Redis 프로바이더 - NestJS DI에 ioredis 클라이언트를 등록
 * - retryStrategy: 최대 3회 재시도, 지수 백오프 (200ms → 400ms → 600ms)
 * - connect/error/close 이벤트 핸들러로 연결 상태를 모니터링
 */
export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    const logger = new Logger('RedisConfig');
    const config = getRedisConfig(configService);

    const client = new Redis({
      host: config.host,
      port: config.port,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.error(
            `Redis connection failed after ${times} attempts`,
          );
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    client.on('connect', () => {
      logger.log(`Redis connected at ${config.host}:${config.port}`);
    });

    client.on('error', (error: Error) => {
      logger.error(`Redis connection error: ${error.message}`);
    });

    client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    return client;
  },
};
