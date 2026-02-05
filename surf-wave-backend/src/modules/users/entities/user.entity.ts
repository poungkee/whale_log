import {
  Column,
  Entity,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role, SocialProvider } from '../../../common/enums';
import { SpotFavorite } from '../../spots/entities/spot-favorite.entity';
import { SpotVote } from '../../spots/entities/spot-vote.entity';
import { SurfDiary } from '../../diary/entities/surf-diary.entity';
import { Post } from '../../community/posts/entities/post.entity';
import { Comment } from '../../community/comments/entities/comment.entity';
import { Question } from '../../qna/questions/entities/question.entity';
import { Answer } from '../../qna/answers/entities/answer.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { ConditionAlert } from '../../notifications/entities/condition-alert.entity';
import { TermsAgreement } from '../../terms/entities/terms-agreement.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'firebase_uid', type: 'varchar', unique: true })
  firebaseUid: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  nickname: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ name: 'surf_level', type: 'varchar', nullable: true })
  surfLevel: string | null;

  @Column({ type: 'enum', enum: SocialProvider, nullable: true })
  provider: SocialProvider | null;

  @Column({ name: 'fcm_token', type: 'varchar', nullable: true })
  fcmToken: string | null;

  @Column({
    name: 'notifications_enabled',
    type: 'boolean',
    default: true,
  })
  notificationsEnabled: boolean;

  @Column({ name: 'is_suspended', type: 'boolean', default: false })
  isSuspended: boolean;

  @Column({
    name: 'suspended_until',
    type: 'timestamp',
    nullable: true,
  })
  suspendedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  // ---- Relations ----

  @OneToMany(() => SpotFavorite, (favorite) => favorite.user)
  spotFavorites: SpotFavorite[];

  @OneToMany(() => SpotVote, (vote) => vote.user)
  spotVotes: SpotVote[];

  @OneToMany(() => SurfDiary, (diary) => diary.user)
  diaries: SurfDiary[];

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @OneToMany(() => Question, (question) => question.author)
  questions: Question[];

  @OneToMany(() => Answer, (answer) => answer.author)
  answers: Answer[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => ConditionAlert, (alert) => alert.user)
  conditionAlerts: ConditionAlert[];

  @OneToMany(() => TermsAgreement, (agreement) => agreement.user)
  termsAgreements: TermsAgreement[];
}
