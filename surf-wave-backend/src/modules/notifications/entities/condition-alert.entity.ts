/**
 * @file condition-alert.entity.ts
 * @description 파도 조건 알림 엔티티 - condition_alerts 테이블, 자동 알림 조건 설정
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Spot } from '../../spots/entities/spot.entity';

@Entity('condition_alerts')
export class ConditionAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'spot_id', type: 'uuid' })
  spotId: string;

  @Column({
    name: 'min_wave_height',
    type: 'decimal',
    nullable: true,
  })
  minWaveHeight: number | null;

  @Column({
    name: 'max_wind_speed',
    type: 'decimal',
    nullable: true,
  })
  maxWindSpeed: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // ---- Relations ----

  @ManyToOne(() => User, (user) => user.conditionAlerts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Spot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spot_id' })
  spot: Spot;
}
