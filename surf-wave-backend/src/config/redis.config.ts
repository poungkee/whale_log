import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export interface RedisConfig {
  host: string;
  port: number;
}

export const getRedisConfig = (configService: ConfigService): RedisConfig => {
  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
  };
};

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
