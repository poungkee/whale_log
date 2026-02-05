import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ForecastsController } from './forecasts.controller';
import { ForecastsService } from './forecasts.service';
import { Forecast } from './entities/forecast.entity';
import { OpenMeteoProvider } from './providers/open-meteo.provider';
import { SpotsModule } from '../spots/spots.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Forecast]),
    HttpModule,
    SpotsModule,
  ],
  controllers: [ForecastsController],
  providers: [ForecastsService, OpenMeteoProvider],
  exports: [ForecastsService],
})
export class ForecastsModule {}
