import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { User } from '../../../users/entities/user.entity';
import { Question } from '../../questions/entities/question.entity';

@Entity('answers')
@Index('IDX_answer_question', ['questionId'])
export class Answer extends BaseEntity {
  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_accepted', type: 'boolean', default: false })
  isAccepted: boolean;

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount: number;

  // ---- Relations ----

  @ManyToOne(() => Question, (question) => question.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ManyToOne(() => User, (user) => user.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;
}
