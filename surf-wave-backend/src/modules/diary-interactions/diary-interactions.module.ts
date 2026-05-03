/**
 * @file diary-interactions.module.ts
 * @description 다이어리 댓글 + 도움됐어요 모듈
 *
 * OnModuleInit으로 테이블 자동 생성 (synchronize=false 대응)
 */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DiaryComment } from './entities/diary-comment.entity';
import { DiaryHelpful } from './entities/diary-helpful.entity';
import { DiaryInteractionsService } from './diary-interactions.service';
import { DiaryInteractionsController } from './diary-interactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DiaryComment, DiaryHelpful])],
  controllers: [DiaryInteractionsController],
  providers: [DiaryInteractionsService],
  exports: [DiaryInteractionsService],
})
export class DiaryInteractionsModule implements OnModuleInit {
  private readonly logger = new Logger(DiaryInteractionsModule.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      /** 다이어리 댓글 테이블 */
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS diary_comments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          diary_id uuid NOT NULL REFERENCES surf_diaries(id) ON DELETE CASCADE,
          author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          parent_id uuid REFERENCES diary_comments(id) ON DELETE CASCADE,
          content text NOT NULL,
          depth smallint NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        )
      `);
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_diary_comments_diary" ON diary_comments(diary_id)`,
      );
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_diary_comments_author" ON diary_comments(author_id)`,
      );

      /** 다이어리 도움됐어요 테이블 */
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS diary_helpfuls (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          diary_id uuid NOT NULL REFERENCES surf_diaries(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz,
          CONSTRAINT "UQ_diary_helpful_user_diary" UNIQUE(user_id, diary_id)
        )
      `);
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_diary_helpful_diary" ON diary_helpfuls(diary_id)`,
      );

      this.logger.log('diary_comments + diary_helpfuls 테이블 확인 완료');
    } catch (err) {
      this.logger.error(`diary-interactions 초기화 실패: ${(err as Error).message}`);
    }
  }
}
