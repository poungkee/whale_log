/**
 * @file badge.entity.ts
 * @description 뱃지 정의 엔티티 - badges 테이블
 *
 * 앱에서 획득 가능한 모든 뱃지의 정의를 저장합니다.
 * 실제 유저 획득 정보는 UserBadge 엔티티(user_badges 테이블)에 저장됩니다.
 */

import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { UserBadge } from './user-badge.entity';

@Entity('badges')
export class Badge {
  /** 뱃지 고유 키 (예: WELCOME, FIRST_DIARY) — 코드에서 직접 참조 */
  @PrimaryColumn({ type: 'varchar', length: 60 })
  key: string;

  /** 뱃지 이름 (한국어) */
  @Column({ name: 'name_ko', type: 'varchar', length: 50 })
  nameKo: string;

  /** 뱃지 획득 조건 설명 (한국어) */
  @Column({ name: 'description_ko', type: 'varchar', length: 200 })
  descriptionKo: string;

  /** 히든 뱃지 여부 — true면 조건을 "???"로 숨김 */
  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden: boolean;

  /** 뱃지 아이콘 이모지 */
  @Column({ type: 'varchar', length: 10 })
  icon: string;

  /** 뱃지 카테고리 (PROFILE, DIARY, RECORD, BOARD, SPOT, TIME, SATISFACTION, STREAK, COMMUNITY, STORY, LIMITED) */
  @Column({ type: 'varchar', length: 30 })
  category: string;

  /** 정렬 순서 */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** 생성 시각 */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** 이 뱃지를 획득한 유저 목록 */
  @OneToMany(() => UserBadge, (ub) => ub.badge)
  userBadges: UserBadge[];
}
