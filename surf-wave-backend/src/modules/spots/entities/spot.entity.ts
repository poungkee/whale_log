import {
  Column,
  Entity,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Difficulty } from '../../../common/enums';
import { Forecast } from '../../forecasts/entities/forecast.entity';
import { SpotFavorite } from './spot-favorite.entity';
import { SpotVote } from './spot-vote.entity';
import { SurfDiary } from '../../diary/entities/surf-diary.entity';

@Entity('spots')
export class Spot extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  region: string | null;

  @Column({ type: 'enum', enum: Difficulty })
  difficulty: Difficulty;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  amenities: Record<string, any> | null;

  // ---- Relations ----

  @OneToMany(() => Forecast, (forecast) => forecast.spot)
  forecasts: Forecast[];

  @OneToMany(() => SpotFavorite, (favorite) => favorite.spot)
  favorites: SpotFavorite[];

  @OneToMany(() => SpotVote, (vote) => vote.spot)
  votes: SpotVote[];

  @OneToMany(() => SurfDiary, (diary) => diary.spot)
  diaries: SurfDiary[];
}
