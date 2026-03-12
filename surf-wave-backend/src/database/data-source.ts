/**
 * @file data-source.ts
 * @description TypeORM DataSource 설정 - 마이그레이션 CLI에서 사용하는 DB 연결 설정
 */
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import {
  DEFAULT_DB_HOST,
  DEFAULT_DB_PORT,
  DEFAULT_DB_USERNAME,
  DEFAULT_DB_PASSWORD,
  DEFAULT_DB_DATABASE,
} from '../config/defaults';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || DEFAULT_DB_HOST,
  port: parseInt(process.env.DB_PORT || String(DEFAULT_DB_PORT), 10),
  username: process.env.DB_USERNAME || DEFAULT_DB_USERNAME,
  password: process.env.DB_PASSWORD || DEFAULT_DB_PASSWORD,
  database: process.env.DB_DATABASE || DEFAULT_DB_DATABASE,
  entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
