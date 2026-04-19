/**
 * @file user-badge.entity.ts
 * @description 유저 획득 뱃지 엔티티 - user_badges 테이블
 *
 * 특정 유저가 특정 뱃지를 획득한 기록을 저장합니다.
 * (userId + badgeKey) 조합에 유니크 제약을 걸어 중복 수여를 방지합니다.
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
import { User } from '../../users/entities/user.entity';
import { Badge } from './badge.entity';

@Entity('user_badges')
@Unique('UQ_user_badge', ['userId', 'badgeKey'])
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 뱃지를 획득한 유저 ID */
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** 획득한 뱃지 키 */
  @Column({ name: 'badge_key', type: 'varchar', length: 60 })
  badgeKey: string;

  /** 뱃지 획득 시각 */
  @CreateDateColumn({ name: 'earned_at', type: 'timestamptz' })
  earnedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Badge, (b) => b.userBadges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_key', referencedColumnName: 'key' })
  badge: Badge;
}
