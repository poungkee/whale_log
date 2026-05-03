/**
 * @file diary-comment.entity.ts
 * @description 다이어리 댓글 엔티티 — diary_comments 테이블
 *
 * 사용자가 공개 다이어리에 다는 댓글.
 * - parentId 자기참조로 대댓글 지원 (depth 제한 1단계)
 * - 작성자 본인만 수정/삭제 가능
 */
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { SurfDiary } from '../../diary/entities/surf-diary.entity';

@Entity('diary_comments')
@Index('IDX_diary_comments_diary', ['diaryId'])
@Index('IDX_diary_comments_author', ['authorId'])
export class DiaryComment extends BaseEntity {
  @Column({ name: 'diary_id', type: 'uuid' })
  diaryId: string;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  /** 대댓글 부모 ID (자기참조). null이면 최상위 댓글. */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ type: 'text' })
  content: string;

  /** 댓글 깊이 (0=최상위, 1=대댓글) — 1로 제한 */
  @Column({ type: 'smallint', default: 0 })
  depth: number;

  @ManyToOne(() => SurfDiary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'diary_id' })
  diary: SurfDiary;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;
}
