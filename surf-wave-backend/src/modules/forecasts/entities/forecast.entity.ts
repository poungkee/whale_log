import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WindDirection, TideStatus } from '../../../common/enums';
import { Spot } from '../../spots/entities/spot.entity';

@Entity('forecasts')
@Index('IDX_forecast_spot_time', ['spotId', 'forecastTime'])
export class Forecast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'spot_id', type: 'uuid' })
  spotId: string;

  @Column({ name: 'forecast_time', type: 'timestamptz' })
  forecastTime: Date;

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

  @Column({
    name: 'wind_speed',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  windSpeed: number;

  @Column({
    name: 'wind_gusts',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  windGusts: number;

  @Column({
    name: 'wind_direction',
    type: 'enum',
    enum: WindDirection,
  })
  windDirection: WindDirection;

  @Column({
    name: 'tide_height',
    type: 'decimal',
    precision: 4,
    scale: 2,
  })
  tideHeight: number;

  @Column({
    name: 'tide_status',
    type: 'enum',
    enum: TideStatus,
  })
  tideStatus: TideStatus;

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
