/**
 * @file diary.module.ts
 * @description 서핑 다이어리(일지) 모듈 - 서핑 세션 기록 CRUD
 *
 * OnModuleInit으로 surf_diaries.rating 컬럼 자동 추가 (synchronize=false 대응)
 */
import { Module, OnModuleInit, Logger, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';
import { SurfDiary } from './entities/surf-diary.entity';
import { DiaryImage } from './entities/diary-image.entity';
import { SpotsModule } from '../spots/spots.module';
import { ForecastsModule } from '../forecasts/forecasts.module';
import { BadgesModule } from '../badges/badges.module';
import { CommunityModule } from '../community/community.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurfDiary, DiaryImage]),
    SpotsModule,
    ForecastsModule,
    BadgesModule,
    /**
     * Phase 2D: 다이어리 신고를 ReportsService에 위임
     * forwardRef — Community→Diary, Diary→Community 순환 의존 방지
     */
    forwardRef(() => CommunityModule),
  ],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule implements OnModuleInit {
  private readonly logger = new Logger(DiaryModule.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 부팅 시 surf_diaries 테이블 신규 컬럼 자동 추가 (synchronize=false 대응)
   *
   * 추가 컬럼:
   * - rating SMALLINT NULL: 스팟 별점 (기존)
   * - is_hidden BOOLEAN NOT NULL DEFAULT false: 관리자 숨김 처리 여부 (Phase 2D)
   *
   * 멱등 패턴 — IF NOT EXISTS로 첫 부팅에만 적용, 이후 NOOP
   */
  async onModuleInit() {
    try {
      await this.dataSource.query(
        `ALTER TABLE surf_diaries ADD COLUMN IF NOT EXISTS rating SMALLINT`,
      );
      this.logger.log('surf_diaries.rating 컬럼 확인 완료');

      /** Phase 2D: 관리자 숨김 컬럼 — 신고 처리 시 사용 */
      await this.dataSource.query(
        `ALTER TABLE surf_diaries ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false`,
      );
      /** 공개 피드 조회 성능 — visibility=PUBLIC AND is_hidden=false 복합 필터 가속 */
      await this.dataSource.query(
        `CREATE INDEX IF NOT EXISTS IDX_diaries_is_hidden ON surf_diaries(is_hidden)`,
      );
      this.logger.log('surf_diaries.is_hidden 컬럼 확인 완료');
    } catch (err) {
      this.logger.error(`surf_diaries 마이그레이션 실패: ${(err as Error).message}`);
    }
  }
}
