import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

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
