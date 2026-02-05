import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { getRedisConfig, RedisProvider } from './redis.config';
import { getFirebaseConfig, FirebaseProvider } from './firebase.config';
import { getAwsS3Config, S3Provider } from './aws.config';

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
