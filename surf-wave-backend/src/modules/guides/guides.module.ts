/**
 * @file guides.module.ts
 * @description 서핑 가이드(교육 콘텐츠) 모듈
 *
 * OnModuleInit으로 guides + guide_progress 테이블 + enum 자동 생성
 * (synchronize=false 프로덕션 환경 대응)
 */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';
import { Guide } from './entities/guide.entity';
import { GuideProgress } from './entities/guide-progress.entity';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [TypeOrmModule.forFeature([Guide, GuideProgress]), BadgesModule],
  controllers: [GuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule implements OnModuleInit {
  private readonly logger = new Logger(GuidesModule.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 모듈 초기화 시 guides 관련 enum + 테이블이 없으면 생성
   * (synchronize=false 프로덕션 환경에서도 안전하게 동작)
   *
   * GuideCategory enum: BEGINNER, TECHNIQUE, SAFETY, EQUIPMENT, ETIQUETTE, WEATHER
   */
  async onModuleInit() {
    try {
      /** GuideCategory enum 타입 */
      await this.dataSource.query(`
        DO $$ BEGIN
          CREATE TYPE "guides_category_enum" AS ENUM (
            'BEGINNER','TECHNIQUE','SAFETY','EQUIPMENT','ETIQUETTE','WEATHER'
          );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      /** guides 테이블 — 운영자가 추가/수정/삭제하는 가이드 콘텐츠 */
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS guides (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title varchar(200) NOT NULL,
          content text NOT NULL,
          category guides_category_enum NOT NULL,
          thumbnail_url varchar,
          sort_order smallint NOT NULL DEFAULT 0,
          estimated_read_minutes int NOT NULL DEFAULT 3,
          is_published boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      /** guide_progress 테이블 — 사용자별 가이드 학습 진행도 */
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS guide_progress (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
          is_completed boolean NOT NULL DEFAULT false,
          completed_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(user_id, guide_id)
        )
      `);

      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_guides_category" ON guides(category)`,
      );
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_guides_published" ON guides(is_published)`,
      );
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_guide_progress_user" ON guide_progress(user_id)`,
      );

      this.logger.log('guides + guide_progress 테이블 + enum 확인 완료');
    } catch (err) {
      this.logger.error(`guides 초기화 실패: ${(err as Error).message}`);
    }
  }
}
