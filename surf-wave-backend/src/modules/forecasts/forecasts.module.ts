/**
 * @file forecasts.module.ts
 * @description 파도/날씨 예보 모듈 - Open-Meteo API로 해양 기상 데이터를 조회하고 캐싱
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ForecastsController, ForecastAdminController } from './forecasts.controller';
import { ForecastsService } from './forecasts.service';
import { Forecast } from './entities/forecast.entity';
import { OpenMeteoProvider } from './providers/open-meteo.provider';
import { SpotsModule } from '../spots/spots.module';
import { KhoaModule } from '../khoa/khoa.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Forecast]),
    HttpModule,
    SpotsModule,
    /** KHOA 서핑지수 모듈 - 한국 스팟 파도 데이터 보강 */
    KhoaModule,
  ],
  controllers: [ForecastsController, ForecastAdminController],
  providers: [ForecastsService, OpenMeteoProvider],
  exports: [ForecastsService],
})
export class ForecastsModule {}
