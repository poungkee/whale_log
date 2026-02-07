/**
 * @file surf-diary.entity.ts
 * @description 서핑 다이어리 엔티티 - surf_diaries 테이블, 서핑 세션 기록
 */
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  BoardType,
  Visibility,
  WindDirection,
} from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Spot } from '../../spots/entities/spot.entity';
import { DiaryImage } from './diary-image.entity';

@Entity('surf_diaries')
export class SurfDiary extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'spot_id', type: 'uuid' })
  spotId: string;

  @Column({ name: 'surf_date', type: 'date' })
  surfDate: string;

  @Column({
    name: 'board_type',
    type: 'enum',
    enum: BoardType,
  })
  boardType: BoardType;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'smallint' })
  satisfaction: number;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({
    type: 'enum',
    enum: Visibility,
    default: Visibility.PRIVATE,
  })
  visibility: Visibility;

  @Column({
    name: 'wave_height',
    type: 'decimal',
    nullable: true,
  })
  waveHeight: number | null;

  @Column({
    name: 'wave_period',
    type: 'decimal',
    nullable: true,
  })
  wavePeriod: number | null;

  @Column({
    name: 'wind_speed',
    type: 'decimal',
    nullable: true,
  })
  windSpeed: number | null;

  @Column({
    name: 'wind_direction',
    type: 'enum',
    enum: WindDirection,
    nullable: true,
  })
  windDirection: WindDirection | null;

  // ---- Relations ----

  @ManyToOne(() => User, (user) => user.diaries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Spot, (spot) => spot.diaries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spot_id' })
  spot: Spot;

  @OneToMany(() => DiaryImage, (image) => image.diary)
  images: DiaryImage[];
}
