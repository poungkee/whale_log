/**
 * @file user.entity.ts
 * @description 사용자(User) 엔티티 - users 테이블 매핑
 *
 * 애플리케이션의 핵심 엔티티로, 모든 사용자 정보를 저장합니다.
 * Firebase UID를 통해 소셜 로그인 계정과 연결되며,
 * 다이어리, 게시글, 댓글, 질문, 답변, 알림, 즐겨찾기 등
 * 거의 모든 기능의 주체로 관계(Relation)를 맺고 있습니다.
 */
import {
  Column,
  Entity,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role, SocialProvider, UserBoardType } from '../../../common/enums';
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
  /** 소셜 로그인 고유 식별자 (Google/Kakao의 sub/id) - nullable for email signup */
  @Column({ name: 'firebase_uid', type: 'varchar', unique: true, nullable: true })
  firebaseUid: string | null;

  /** 사용자 이메일 */
  @Column({ type: 'varchar', unique: true })
  email: string;

  /** 비밀번호 해시 - 일반 회원가입 시에만 저장, 소셜 로그인은 null */
  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  /** 닉네임 - 서비스 내에서 사용하는 표시 이름 (최대 30자, 고유값) */
  @Column({ type: 'varchar', length: 30, unique: true })
  nickname: string;

  /** 자기소개 - 프로필에 표시되는 간단한 소개글 */
  @Column({ type: 'text', nullable: true })
  bio: string | null;

  /** 프로필 사진 URL - S3에 업로드된 이미지 경로 */
  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  /** 사용자 역할 - USER(일반) 또는 ADMIN(관리자) */
  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  /** 서핑 실력 레벨 - 사용자가 직접 설정 (예: 초급, 중급, 고급) */
  @Column({ name: 'surf_level', type: 'varchar', nullable: true })
  surfLevel: string | null;

  /** 주로 사용하는 보드 타입 - 서핑 추천 시 보드 특성 반영 */
  @Column({
    name: 'board_type',
    type: 'varchar',
    length: 20,
    default: UserBoardType.UNSET,
  })
  boardType: UserBoardType;

  /** 소셜 로그인 제공자 - GOOGLE, APPLE, KAKAO */
  @Column({ type: 'enum', enum: SocialProvider, nullable: true })
  provider: SocialProvider | null;

  /** FCM 토큰 - 모바일 푸시 알림 전송을 위한 디바이스 토큰 */
  @Column({ name: 'fcm_token', type: 'varchar', nullable: true })
  fcmToken: string | null;

  /** 알림 수신 활성화 여부 - false이면 푸시 알림을 보내지 않음 */
  @Column({
    name: 'notifications_enabled',
    type: 'boolean',
    default: true,
  })
  notificationsEnabled: boolean;

  /** 계정 정지 여부 - 관리자가 제재한 계정 */
  @Column({ name: 'is_suspended', type: 'boolean', default: false })
  isSuspended: boolean;

  /** 정지 해제 예정 시각 - null이면 영구 정지 또는 정지되지 않은 상태 */
  @Column({
    name: 'suspended_until',
    type: 'timestamp',
    nullable: true,
  })
  suspendedUntil: Date | null;

  /** 마지막 로그인 시각 - 활동 추적 및 비활성 사용자 관리용 */
  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  // ===== 관계 (Relations) =====

  /** 즐겨찾기한 서핑 스팟 목록 */
  @OneToMany(() => SpotFavorite, (favorite) => favorite.user)
  spotFavorites: SpotFavorite[];

  /** 서핑 스팟에 대한 투표 이력 */
  @OneToMany(() => SpotVote, (vote) => vote.user)
  spotVotes: SpotVote[];

  /** 작성한 서핑 다이어리 목록 */
  @OneToMany(() => SurfDiary, (diary) => diary.user)
  diaries: SurfDiary[];

  /** 작성한 커뮤니티 게시글 목록 */
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  /** 작성한 댓글 목록 */
  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  /** 작성한 Q&A 질문 목록 */
  @OneToMany(() => Question, (question) => question.author)
  questions: Question[];

  /** 작성한 Q&A 답변 목록 */
  @OneToMany(() => Answer, (answer) => answer.author)
  answers: Answer[];

  /** 수신한 알림 목록 */
  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  /** 설정한 파도 조건 알림 목록 */
  @OneToMany(() => ConditionAlert, (alert) => alert.user)
  conditionAlerts: ConditionAlert[];

  /** 약관 동의 이력 */
  @OneToMany(() => TermsAgreement, (agreement) => agreement.user)
  termsAgreements: TermsAgreement[];
}
