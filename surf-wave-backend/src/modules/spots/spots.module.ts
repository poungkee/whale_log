/**
 * @file spots.module.ts
 * @description 서핑 스팟(해변) 모듈
 *
 * 서핑 스팟 목록 조회, 상세 정보, 주변 스팟 검색, 즐겨찾기, 투표 기능을 담당합니다.
 * Spot, SpotFavorite, SpotVote 3개의 엔티티를 관리합니다.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpotsController } from './spots.controller';
import { SpotsService } from './spots.service';
import { Spot } from './entities/spot.entity';
import { SpotFavorite } from './entities/spot-favorite.entity';
import { SpotVote } from './entities/spot-vote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Spot, SpotFavorite, SpotVote])],
  controllers: [SpotsController],
  providers: [SpotsService],
  exports: [SpotsService],
})
export class SpotsModule {}
