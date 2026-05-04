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

  /**
   * 서핑 시작 시간 (HH:mm 형식, 예: "10:00")
   * - nullable: 기존 데이터 호환 + 시간 미입력 허용
   * - 이 값이 있으면 해당 시점의 forecast 데이터를 자동 매칭
   */
  @Column({ name: 'surf_time', type: 'varchar', length: 5, nullable: true })
  surfTime: string | null;

  @Column({
    name: 'board_type',
    type: 'enum',
    enum: BoardType,
  })
  boardType: BoardType;

  /**
   * 그날 사용한 보드 길이 (피트, 소수점 1자리)
   * 예: 6.2, 9.0, 5.8
   * null이면 미입력 (선택사항)
   */
  @Column({ name: 'board_size_ft', type: 'decimal', precision: 3, scale: 1, nullable: true })
  boardSizeFt: number | null;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'smallint' })
  satisfaction: number;

  /**
   * 이 스팟에 대한 사용자 별점 (1~5, 선택)
   * - null이면 별점 안 매김 (기본 동작)
   * - 별점 매기면 spots 테이블의 평균 rating + ratingCount에 반영됨
   * - 공개/비공개 무관하게 평균에 합산 (사용자 의견에 따라)
   */
  @Column({ type: 'smallint', nullable: true })
  rating: number | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({
    type: 'enum',
    enum: Visibility,
    default: Visibility.PRIVATE,
  })
  visibility: Visibility;

  /**
   * 관리자 숨김 처리 여부 (Phase 2D 신고 시스템 연동)
   *
   * - true: 관리자가 부적절 컨텐츠로 판단하여 강제 숨김 (사용자가 visibility 변경해도 노출 안 됨)
   * - false: 정상 노출 (visibility 정책에 따름)
   * - 작성자 본인은 자신의 다이어리를 항상 볼 수 있음(숨김이어도) — findById에서 우회
   * - 공개 피드/스팟별 다이어리 목록 조회 시 isHidden=false 필터 필수
   */
  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden: boolean;

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
