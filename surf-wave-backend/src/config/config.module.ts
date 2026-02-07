/**
 * @file config.module.ts
 * @description 애플리케이션 설정 모듈 - 외부 서비스 프로바이더 통합 관리
 *
 * 환경 변수 로드 및 외부 서비스(Redis, Firebase, AWS S3) 클라이언트를
 * NestJS DI(Dependency Injection) 컨테이너에 등록하는 글로벌 모듈입니다.
 *
 * @Global() 데코레이터를 사용하여 모든 모듈에서 별도 import 없이
 * Redis, Firebase Admin, S3 클라이언트를 주입받을 수 있습니다.
 *
 * 프로덕션 환경에서는 필수 환경 변수(DB_HOST, DB_PORT 등)가 설정되지 않으면 에러를 발생시킵니다.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { getRedisConfig, RedisProvider } from './redis.config';
import { getFirebaseConfig, FirebaseProvider } from './firebase.config';
import { getAwsS3Config, S3Provider } from './aws.config';

/**
 * @class AppConfigModule
 * @description 글로벌 설정 모듈
 * - NestConfigModule: .env 파일에서 환경 변수 로드 및 유효성 검증
 * - RedisProvider: Redis 캐시 클라이언트 (ioredis)
 * - FirebaseProvider: Firebase Admin SDK (인증, FCM 푸시 알림)
 * - S3Provider: AWS S3 클라이언트 (이미지 업로드)
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
      expandVariables: true,
      cache: true,
      validate: (config: Record<string, unknown>) => {
        // Basic validation: ensure critical env vars exist in production
        if (config['NODE_ENV'] === 'production') {
          const required = [
            'DB_HOST',
            'DB_PORT',
            'DB_USERNAME',
            'DB_PASSWORD',
            'DB_DATABASE',
          ];
          for (const key of required) {
            if (!config[key]) {
              throw new Error(
                `Missing required environment variable: ${key}`,
              );
            }
          }
        }
        return config;
      },
    }),
  ],
  providers: [RedisProvider, FirebaseProvider, S3Provider],
  exports: [
    NestConfigModule,
    RedisProvider,
    FirebaseProvider,
    S3Provider,
  ],
})
export class AppConfigModule {}

export { getRedisConfig, getFirebaseConfig, getAwsS3Config };
