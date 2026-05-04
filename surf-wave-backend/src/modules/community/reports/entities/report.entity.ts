/**
 * @file report.entity.ts
 * @description 신고 엔티티 - reports 테이블, 신고 사유/상태/대상 콘텐츠
 */
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { ReportReason, ReportStatus } from '../../../../common/enums';
import { User } from '../../../users/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { SurfDiary } from '../../../diary/entities/surf-diary.entity';

@Entity('reports')
@Index('IDX_report_status', ['status'])
@Index('IDX_report_diary_id', ['diaryId'])
export class Report extends BaseEntity {
  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId: string | null;

  @Column({ name: 'comment_id', type: 'uuid', nullable: true })
  commentId: string | null;

  /**
   * 신고 대상 다이어리 ID (Phase 2D 추가)
   * - postId / commentId / diaryId 중 정확히 하나만 NOT NULL
   * - 다이어리 삭제 시 ON DELETE SET NULL — 신고 통계용으로 reports 행은 보존
   */
  @Column({ name: 'diary_id', type: 'uuid', nullable: true })
  diaryId: string | null;

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ name: 'resolved_by_id', type: 'uuid', nullable: true })
  resolvedById: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  // ---- Relations ----

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @ManyToOne(() => Post, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'post_id' })
  post: Post | null;

  @ManyToOne(() => Comment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment | null;

  /** 신고 대상 다이어리 (Phase 2D 추가, 다이어리 삭제 시 SET NULL) */
  @ManyToOne(() => SurfDiary, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'diary_id' })
  diary: SurfDiary | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy: User | null;
}
