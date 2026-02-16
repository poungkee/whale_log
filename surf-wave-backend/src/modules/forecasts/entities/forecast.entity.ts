/**
 * @file forecast.entity.ts
 * @description 예보 엔티티 - forecasts 테이블
 *
 * 스팟별 시간대별 파도/스웰/바람 예보 데이터를 저장합니다.
 * 데이터 소스: Open-Meteo Marine API (파도/스웰) + Weather API (바람)
 * 수집 주기: 30분 크론
 * 저장 방식: (spot_id, forecast_time) 기준 upsert
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TideStatus } from '../../../common/enums';
import { Spot } from '../../spots/entities/spot.entity';

@Entity('forecasts')
@Unique('UQ_forecast_spot_time', ['spotId', 'forecastTime'])
@Index('IDX_forecast_spot_time', ['spotId', 'forecastTime'])
export class Forecast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'spot_id', type: 'uuid' })
  spotId: string;

  @Column({ name: 'forecast_time', type: 'timestamptz' })
  forecastTime: Date;

  // ---- 파도 (Marine API) ----

  @Column({
    name: 'wave_height',
    type: 'decimal',
    precision: 4,
    scale: 2,
  })
  waveHeight: number;

  @Column({
    name: 'wave_period',
    type: 'decimal',
    precision: 4,
    scale: 1,
  })
  wavePeriod: number;

  @Column({
    name: 'wave_direction',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  waveDirection: number;

  // ---- 스웰 (Marine API) ----

  @Column({
    name: 'swell_height',
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  swellHeight: number | null;

  @Column({
    name: 'swell_period',
    type: 'decimal',
    precision: 4,
    scale: 1,
    nullable: true,
  })
  swellPeriod: number | null;

  @Column({
    name: 'swell_direction',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  swellDirection: number | null;

  // ---- 바람 (Weather API) ----

  @Column({
    name: 'wind_speed',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  windSpeed: number | null;

  @Column({
    name: 'wind_gusts',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  windGusts: number | null;

  @Column({
    name: 'wind_direction',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  windDirection: number | null;

  // ---- 조석 (Marine API - sea_level_height_msl) ----

  @Column({
    name: 'tide_height',
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  tideHeight: number | null;

  @Column({
    name: 'tide_status',
    type: 'enum',
    enum: TideStatus,
    nullable: true,
  })
  tideStatus: TideStatus | null;

  @Column({
    name: 'water_temperature',
    type: 'decimal',
    precision: 4,
    scale: 1,
    nullable: true,
  })
  waterTemperature: number | null;

  @Column({
    name: 'air_temperature',
    type: 'decimal',
    precision: 4,
    scale: 1,
    nullable: true,
  })
  airTemperature: number | null;

  @Column({
    name: 'weather_condition',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  weatherCondition: string | null;

  // ---- 메타 ----

  @Column({ name: 'fetched_at', type: 'timestamptz' })
  fetchedAt: Date;

  @Column({ type: 'varchar', length: 30 })
  source: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ---- Relations ----

  @ManyToOne(() => Spot, (spot) => spot.forecasts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spot_id' })
  spot: Spot;
}
