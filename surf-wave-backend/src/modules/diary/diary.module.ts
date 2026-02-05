import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';
import { SurfDiary } from './entities/surf-diary.entity';
import { DiaryImage } from './entities/diary-image.entity';
import { SpotsModule } from '../spots/spots.module';
import { ForecastsModule } from '../forecasts/forecasts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurfDiary, DiaryImage]),
    SpotsModule,
    ForecastsModule,
  ],
  controllers: [DiaryController],
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
