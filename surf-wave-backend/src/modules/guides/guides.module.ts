/**
 * @file guides.module.ts
 * @description 서핑 가이드(교육 콘텐츠) 모듈
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';
import { Guide } from './entities/guide.entity';
import { GuideProgress } from './entities/guide-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guide, GuideProgress])],
  controllers: [GuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}
