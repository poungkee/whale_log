/**
 * @file spot-favorite.entity.ts
 * @description 스팟 즐겨찾기 엔티티 - spot_favorites 테이블 매핑
 *
 * 사용자가 즐겨찾기한 서핑 스팟 정보를 저장합니다.
 * userId + spotId 조합이 유니크하여 중복 즐겨찾기를 방지합니다.
 * User, Spot과 다대일(ManyToOne) 관계입니다.
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
import { Spot } from './spot.entity';

@Entity('spot_favorites')
@Unique('UQ_spot_favorite_user_spot', ['userId', 'spotId'])
export class SpotFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'spot_id', type: 'uuid' })
  spotId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ---- Relations ----

  @ManyToOne(() => User, (user) => user.spotFavorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Spot, (spot) => spot.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spot_id' })
  spot: Spot;
}
