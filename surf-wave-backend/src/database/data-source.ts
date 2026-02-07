/**
 * @file data-source.ts
 * @description TypeORM DataSource 설정 - 마이그레이션 CLI에서 사용하는 DB 연결 설정
 */
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'surfwave',
  password: process.env.DB_PASSWORD || 'surfwave123',
  database: process.env.DB_DATABASE || 'surfwave',
  entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
