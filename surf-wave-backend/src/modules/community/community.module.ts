/**
 * @file community.module.ts
 * @description 커뮤니티 모듈 - 게시글, 댓글, 좋아요, 북마크, 신고 통합 모듈
 *
 * OnModuleInit으로 reports.diary_id 컬럼 자동 추가 (Phase 2D 다이어리 신고 시스템).
 * synchronize=false 프로덕션 환경에서 멱등 SQL로 안전하게 마이그레이션.
 */
import { Module, OnModuleInit, Logger, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PostsController } from './posts/posts.controller';
import { PostsService } from './posts/posts.service';
import { CommentsController } from './comments/comments.controller';
import { CommentsService } from './comments/comments.service';
import { LikesService } from './likes/likes.service';
import { BookmarksService } from './bookmarks/bookmarks.service';
import { ReportsService } from './reports/reports.service';
import { Post } from './posts/entities/post.entity';
import { PostImage } from './posts/entities/post-image.entity';
import { Comment } from './comments/entities/comment.entity';
import { Like } from './likes/like.entity';
import { Bookmark } from './bookmarks/bookmark.entity';
import { Report } from './reports/entities/report.entity';
import { SurfDiary } from '../diary/entities/surf-diary.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    /** SurfDiary는 reports.diary_id FK + ReportsService.createDiaryReport에서 사용 */
    TypeOrmModule.forFeature([Post, PostImage, Comment, Like, Bookmark, Report, SurfDiary]),
    NotificationsModule,
  ],
  controllers: [PostsController, CommentsController],
  providers: [
    PostsService,
    CommentsService,
    LikesService,
    BookmarksService,
    ReportsService,
  ],
  exports: [PostsService, CommentsService, ReportsService],
})
export class CommunityModule implements OnModuleInit {
  private readonly logger = new Logger(CommunityModule.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 부팅 시 reports 테이블에 diary_id 컬럼 + FK + 인덱스 자동 생성
   *
   * 마이그레이션 순서:
   * 1. diary_id UUID NULL 컬럼 추가 (post_id/comment_id처럼 nullable)
   * 2. surf_diaries(id)로의 FK 제약 추가 (다이어리 삭제 시 SET NULL → 신고 통계 보존)
   * 3. diary_id 인덱스 — 다이어리별 신고 조회 가속
   *
   * 멱등 패턴: IF NOT EXISTS / DO BEGIN EXCEPTION으로 첫 부팅에만 적용
   */
  async onModuleInit() {
    try {
      /** ① diary_id 컬럼 추가 */
      await this.dataSource.query(
        `ALTER TABLE reports ADD COLUMN IF NOT EXISTS diary_id UUID`,
      );

      /** ② FK 제약 — 이미 있으면 무시 (CONSTRAINT 이름 유니크 활용) */
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_report_diary'
          ) THEN
            ALTER TABLE reports
              ADD CONSTRAINT FK_report_diary
              FOREIGN KEY (diary_id) REFERENCES surf_diaries(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);

      /** ③ 인덱스 추가 */
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS IDX_report_diary_id ON reports(diary_id)`,
      );

      this.logger.log('reports.diary_id 컬럼/FK/인덱스 확인 완료');
    } catch (err) {
      this.logger.error(`reports.diary_id 마이그레이션 실패: ${(err as Error).message}`);
    }
  }
}
