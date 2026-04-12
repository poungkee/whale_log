/**
 * @file admin-log.entity.ts
 * @description 관리자 감사 로그 엔티티 - admin_logs 테이블 (P1-6 추가)
 *
 * 관리자가 수행한 모든 주요 액션을 기록합니다.
 * 언제, 누가, 무엇에, 어떤 행동을 했는지 추적합니다.
 *
 * 저장되는 액션 유형:
 * - SUSPEND_USER / UNSUSPEND_USER: 사용자 정지/해제
 * - CHANGE_ROLE: 역할 변경
 * - HIDE_POST / SHOW_POST: 게시글 숨김/노출
 * - DELETE_SPOT: 스팟 삭제
 * - RESOLVE_REPORT: 신고 처리
 * - DELETE_GUIDE: 가이드 삭제
 * - BROADCAST: 전체 공지 전송
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** 관리자 액션 유형 — 감사 로그에 기록되는 행동 분류 */
export enum AdminActionType {
  /** 사용자 관련 */
  SUSPEND_USER   = 'SUSPEND_USER',     // 사용자 정지
  UNSUSPEND_USER = 'UNSUSPEND_USER',   // 사용자 정지 해제
  CHANGE_ROLE    = 'CHANGE_ROLE',      // 역할 변경 (USER ↔ ADMIN)
  /** 콘텐츠 관련 */
  HIDE_POST      = 'HIDE_POST',        // 게시글 숨김
  SHOW_POST      = 'SHOW_POST',        // 게시글 노출 복원
  DELETE_SPOT    = 'DELETE_SPOT',      // 스팟 삭제
  DELETE_GUIDE   = 'DELETE_GUIDE',     // 가이드 삭제
  /** 신고 처리 */
  RESOLVE_REPORT = 'RESOLVE_REPORT',   // 신고 처리 완료
  /** 알림 */
  BROADCAST      = 'BROADCAST',        // 전체 공지 전송
}

/** 감사 로그 대상 리소스 분류 */
export enum AdminTargetType {
  USER    = 'USER',
  POST    = 'POST',
  SPOT    = 'SPOT',
  GUIDE   = 'GUIDE',
  REPORT  = 'REPORT',
  SYSTEM  = 'SYSTEM',  // 전체 공지 등 특정 리소스가 없는 경우
}

@Entity('admin_logs')
@Index('IDX_admin_logs_admin', ['adminId'])
@Index('IDX_admin_logs_created', ['createdAt'])
export class AdminLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 액션을 수행한 관리자 UUID */
  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  /**
   * 수행한 액션 유형
   * 예: SUSPEND_USER, HIDE_POST, RESOLVE_REPORT
   */
  @Column({
    name: 'action_type',
    type: 'enum',
    enum: AdminActionType,
  })
  actionType: AdminActionType;

  /**
   * 액션 대상 리소스 유형
   * 예: USER, POST, SPOT
   */
  @Column({
    name: 'target_type',
    type: 'enum',
    enum: AdminTargetType,
    nullable: true,
  })
  targetType: AdminTargetType | null;

  /**
   * 액션 대상 리소스 UUID
   * 예: 정지된 사용자 ID, 숨긴 게시글 ID
   * 전체 공지(BROADCAST) 등 특정 대상 없을 때는 null
   */
  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId: string | null;

  /**
   * 사람이 읽을 수 있는 액션 설명
   * 예: "사용자 surf@email.com 7일 정지"
   *     "게시글 '오늘 서핑 후기' 숨김 처리"
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * 추가 메타데이터 (JSONB)
   * 예: { "previousRole": "USER", "newRole": "ADMIN" }
   *     { "reason": "욕설 포함" }
   *     { "suspendedUntil": "2026-04-20T00:00:00Z" }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * 관리자 IP 주소 (IPv4 또는 IPv6)
   * X-Forwarded-For 헤더 또는 req.ip에서 추출
   * 보안 감사 시 위치 추적에 활용
   */
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /** 로그 생성 시각 — 자동 설정 */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ---- Relations ----

  /** 액션을 수행한 관리자 정보 (관리자 계정이 삭제돼도 로그는 유지) */
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin: User | null;
}
