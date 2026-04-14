/**
 * @file khoa-data.entity.ts
 * @description KHOA(국립해양조사원) 서핑지수 히스토리 저장 엔티티
 *
 * 목적:
 *   - KHOA 연안 실측 데이터를 DB에 누적하여 Open-Meteo 보정 계수 계산에 활용
 *   - 보정 계수 = AVG(khoa_wave_height / open_meteo_wave_height) per 스팟
 *
 * 저장 주기: 1시간마다 (KHOA API 갱신 주기와 동일)
 * 중복 방지: spot_id + recorded_date + time_slot UNIQUE 제약
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Spot } from '../../spots/entities/spot.entity';

@Entity('khoa_data')
@Unique(['spotId', 'recordedDate', 'timeSlot']) // 같은 스팟 + 날짜 + 시간대 중복 저장 방지
@Index(['spotId', 'recordedDate'])               // 보정 계수 계산 JOIN 쿼리 최적화
export class KhoaData {
  /** UUID 기본키 */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 우리 DB 스팟 FK — JOIN forecasts 시 사용 */
  @Column({ name: 'spot_id' })
  spotId: string;

  @ManyToOne(() => Spot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spot_id' })
  spot: Spot;

  /** KHOA API 기준 스팟명 (예: "죽도해수욕장") — 디버깅용 */
  @Column({ name: 'khoa_name', type: 'varchar', length: 100 })
  khoaName: string;

  /** 예보 날짜 (YYYY-MM-DD) — forecasts.forecast_time의 DATE와 JOIN */
  @Column({ name: 'recorded_date', type: 'date' })
  recordedDate: string;

  /** 시간대 구분: 오전(AM) / 오후(PM) */
  @Column({ name: 'time_slot', type: 'varchar', length: 10 })
  timeSlot: string;

  // ────────────────────────────────────────────
  // 핵심 수치 데이터 (보정 계수 계산용)
  // ────────────────────────────────────────────

  /**
   * KHOA 연안 파고 (m)
   * Open-Meteo offshore 파고보다 1.5~2배 높은 경향 (실제 서핑 파고에 더 가까움)
   * 보정 계수 계산: khoa_wave_height / open_meteo_wave_height
   */
  @Column({ name: 'wave_height', type: 'decimal', precision: 4, scale: 2, nullable: true })
  waveHeight: number | null;

  /** 파주기 (s) */
  @Column({ name: 'wave_period', type: 'decimal', precision: 4, scale: 2, nullable: true })
  wavePeriod: number | null;

  /** 풍속 (m/s) */
  @Column({ name: 'wind_speed', type: 'decimal', precision: 4, scale: 2, nullable: true })
  windSpeed: number | null;

  /** 수온 (°C) */
  @Column({ name: 'water_temperature', type: 'decimal', precision: 4, scale: 2, nullable: true })
  waterTemperature: number | null;

  // ────────────────────────────────────────────
  // 서핑지수 (레벨별)
  // ────────────────────────────────────────────

  /** 초급 서핑지수: 매우좋음 | 좋음 | 보통 | 나쁨 | 매우나쁨 */
  @Column({ name: 'beginner_index', type: 'varchar', length: 20, nullable: true })
  beginnerIndex: string | null;

  /** 중급 서핑지수 */
  @Column({ name: 'intermediate_index', type: 'varchar', length: 20, nullable: true })
  intermediateIndex: string | null;

  /** 상급 서핑지수 */
  @Column({ name: 'advanced_index', type: 'varchar', length: 20, nullable: true })
  advancedIndex: string | null;

  /** 레코드 생성 시각 (실제 저장된 시각) */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
