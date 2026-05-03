/**
 * @file diary.module.ts
 * @description 서핑 다이어리(일지) 모듈 - 서핑 세션 기록 CRUD
 *
 * OnModuleInit으로 surf_diaries.rating 컬럼 자동 추가 (synchronize=false 대응)
 */
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';
import { SurfDiary } from './entities/surf-diary.entity';
import { DiaryImage } from './entities/diary-image.entity';
import { SpotsModule } from '../spots/spots.module';
import { ForecastsModule } from '../forecasts/forecasts.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurfDiary, DiaryImage]),
    SpotsModule,
    ForecastsModule,
    BadgesModule,
  ],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule implements OnModuleInit {
  private readonly logger = new Logger(DiaryModule.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 부팅 시 surf_diaries.rating 컬럼이 없으면 자동 추가
   * (synchronize=false 프로덕션 환경 대응)
   */
  async onModuleInit() {
    try {
      await this.dataSource.query(
        `ALTER TABLE surf_diaries ADD COLUMN IF NOT EXISTS rating SMALLINT`,
      );
      this.logger.log('surf_diaries.rating 컬럼 확인 완료');
    } catch (err) {
      this.logger.error(`surf_diaries.rating 추가 실패: ${(err as Error).message}`);
    }
  }
}
