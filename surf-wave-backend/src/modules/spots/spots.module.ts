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
