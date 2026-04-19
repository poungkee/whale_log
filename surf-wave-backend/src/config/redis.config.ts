/**
 * @file redis.config.ts
 * @description Redis 캐시 서버 설정 및 프로바이더
 *
 * 환경 변수 (우선순위 순):
 * 1. REDIS_URL: 연결 문자열 전체 (Railway 내부 URL, 최우선)
 * 2. REDIS_HOST + REDIS_PORT + REDIS_PASSWORD: 개별 설정 (로컬 개발)
 */

import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Redis 클라이언트 DI 토큰 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    const logger = new Logger('RedisConfig');

    /** Railway 내부 REDIS_URL이 있으면 우선 사용 */
    const redisUrl = configService.get<string>('REDIS_URL');

    const client = redisUrl
      ? new Redis(redisUrl, {
          retryStrategy: (times) => (times > 3 ? null : times * 200),
          maxRetriesPerRequest: 3,
        })
      : new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          retryStrategy: (times) => (times > 3 ? null : times * 200),
          maxRetriesPerRequest: 3,
        });

    client.on('connect', () => logger.log(`Redis 연결 성공 (URL: ${redisUrl ? 'REDIS_URL' : 'HOST/PORT'})`));
    client.on('error', (e: Error) => logger.error(`Redis 연결 오류: ${e.message}`));
    client.on('close', () => logger.warn('Redis 연결 종료'));

    return client;
  },
};
