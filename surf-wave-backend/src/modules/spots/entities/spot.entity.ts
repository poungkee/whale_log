/**
 * @file spot.entity.ts
 * @description 서핑 스팟(해변) 엔티티 - spots 테이블 매핑
 *
 * 서핑 가능한 해변/포인트 정보를 저장합니다.
 * 위치(GPS 좌표), 난이도, 평점, 부대시설 등의 정보를 포함하며
 * 파도 예보, 즐겨찾기, 투표, 다이어리와 관계를 맺습니다.
 */
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

  /** 스팟 해저/지형 형태 (beach_break, reef_break, point_break) */
  @Column({ name: 'break_type', type: 'varchar', length: 30, nullable: true })
  breakType: string | null;

  /** 이 스팟에 최적인 스웰 방향 (S, SW, W, NW 등) */
  @Column({ name: 'best_swell_direction', type: 'varchar', length: 20, nullable: true })
  bestSwellDirection: string | null;

  /** 서핑 최적 시즌 (예: "4월~10월", "연중") */
  @Column({ type: 'varchar', length: 50, nullable: true })
  season: string | null;

  /**
   * 해안이 바라보는 바다 방향 (0~359도)
   * - 오프쇼어/온쇼어 풍향 점수 계산에 필수
   * - 예: 양양 동해안 = 90°(동쪽 바다), 제주 중문 = 180°(남쪽 바다)
   */
  @Column({ name: 'coast_facing_deg', type: 'int', nullable: true })
  coastFacingDeg: number | null;

  /**
   * 최적 스웰 방향의 허용 범위 (도)
   * - 스웰 매칭 점수(swellFit) 계산 시 사용
   * - beach_break=45°(관대), reef_break=30°(엄격), point_break=25°
   * - 값이 클수록 다양한 방향의 스웰을 수용
   */
  @Column({ name: 'best_swell_spread_deg', type: 'int', nullable: true })
  bestSwellSpreadDeg: number | null;

  /**
   * [override] 이 스팟의 최적 파고 하한 (m)
   * - null이면 breakType+difficulty 템플릿 사용
   * - 값이 있으면 스팟 고유값 우선 적용
   * - 예: Uluwatu는 reef+ADVANCED 템플릿(1.5m)이지만 실제론 1.2m부터 열림 → 1.2
   */
  @Column({ name: 'optimal_wave_min', type: 'decimal', precision: 3, scale: 1, nullable: true })
  optimalWaveMin: number | null;

  /** [override] 이 스팟의 최적 파고 상한 (m) */
  @Column({ name: 'optimal_wave_max', type: 'decimal', precision: 3, scale: 1, nullable: true })
  optimalWaveMax: number | null;

  /** [override] 이 스팟의 허용 파고 하한 (m) - 이 이하면 파도 안 열림 */
  @Column({ name: 'tolerable_wave_min', type: 'decimal', precision: 3, scale: 1, nullable: true })
  tolerableWaveMin: number | null;

  /** [override] 이 스팟의 허용 파고 상한 (m) - 이 이상이면 위험 */
  @Column({ name: 'tolerable_wave_max', type: 'decimal', precision: 3, scale: 1, nullable: true })
  tolerableWaveMax: number | null;

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
