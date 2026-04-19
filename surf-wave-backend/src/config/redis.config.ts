/**
 * @file redis.config.ts
 * @description Redis 캐시 서버 설정 및 프로바이더
 *
 * 환경 변수:
 * - REDIS_HOST: Redis 서버 호스트 (기본값: localhost)
 * - REDIS_PORT: Redis 서버 포트 (기본값: 6379)
 * - REDIS_PASSWORD: Redis 비밀번호 (Railway 프로덕션 환경)
 */

import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Redis 클라이언트 DI 토큰 - @Inject(REDIS_CLIENT)로 주입받을 때 사용 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Redis 프로바이더 - NestJS DI에 ioredis 클라이언트를 등록
 * - REDIS_PASSWORD 환경변수가 있으면 인증 포함하여 연결 (Railway 프로덕션)
 * - retryStrategy: 최대 3회 재시도
 */
export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    const logger = new Logger('RedisConfig');

    const host = configService.get<string>('REDIS_HOST', 'localhost');
    const port = configService.get<number>('REDIS_PORT', 6379);
    const password = configService.get<string>('REDIS_PASSWORD');

    const client = new Redis({
      host,
      port,
      /** 비밀번호가 설정된 경우에만 인증 포함 (Railway Redis는 비밀번호 필수) */
      ...(password ? { password } : {}),
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.error(`Redis connection failed after ${times} attempts`);
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    client.on('connect', () => {
      logger.log(`Redis connected at ${host}:${port}`);
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
