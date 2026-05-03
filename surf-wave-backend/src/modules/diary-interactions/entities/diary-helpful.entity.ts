/**
 * @file diary-helpful.entity.ts
 * @description 다이어리 "도움됐어요" 엔티티 — diary_helpfuls 테이블
 *
 * 좋아요 대신 정보 가치 평가 (인기 경쟁 X, 정보 신뢰성 ⭕).
 * - 사용자당 다이어리당 1회 (UNIQUE)
 * - 토글: 누르면 INSERT, 다시 누르면 DELETE
 */
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { SurfDiary } from '../../diary/entities/surf-diary.entity';

@Entity('diary_helpfuls')
@Unique('UQ_diary_helpful_user_diary', ['userId', 'diaryId'])
@Index('IDX_diary_helpful_diary', ['diaryId'])
export class DiaryHelpful extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'diary_id', type: 'uuid' })
  diaryId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SurfDiary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'diary_id' })
  diary: SurfDiary;
}
