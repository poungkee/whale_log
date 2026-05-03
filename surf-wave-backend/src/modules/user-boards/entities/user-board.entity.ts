/**
 * @file user-board.entity.ts
 * @description 내 보드(UserBoard) 엔티티 - user_boards 테이블
 *
 * 사용자가 보유한 여러 보드를 관리하기 위한 엔티티.
 * - 1 user → N boards (사용자 한 명이 여러 보드 등록 가능)
 * - User.boardType / boardSizeFt 는 메인 보드(isPrimary=true)와 동기화
 * - 다이어리 작성 시 등록된 보드 중 선택 가능 (선택은 옵션, 직접 boardType 입력도 가능)
 *
 * 실사용자 요청 (day10 user_feedback):
 *   "보드 여러 개 가지고 있는데 매번 다이어리에서 보드 타입 직접 입력하는 게 불편함"
 */
import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserBoardType } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('user_boards')
@Index(['userId', 'isPrimary'])
export class UserBoard extends BaseEntity {
  /** 보드 소유자 ID */
  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  /**
   * 보드 별명 — 사용자가 지은 이름 (예: "메인 롱보드", "여행용 피쉬")
   * 동일 boardType을 여러 개 가질 수 있으므로 식별용으로 사용
   */
  @Column({ type: 'varchar', length: 30 })
  nickname: string;

  /** 보드 타입 (9종) */
  @Column({ name: 'board_type', type: 'varchar', length: 20 })
  boardType: UserBoardType;

  /**
   * 보드 길이 (피트, 소수점 1자리)
   * 범위: 3.0 ~ 12.0 ft
   * null 가능 — 초보자는 모를 수 있음
   */
  @Column({ name: 'size_ft', type: 'decimal', precision: 3, scale: 1, nullable: true })
  sizeFt: number | null;

  /**
   * 메인 보드 여부 — 한 사용자에게 1개만 true
   * User.boardType / boardSizeFt 는 isPrimary=true인 보드와 동기화
   */
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  /** 메모 (선택) — 보드 특징, 색상, 스티커 등 자유 기록 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  notes: string | null;

  // ===== 관계 =====
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
