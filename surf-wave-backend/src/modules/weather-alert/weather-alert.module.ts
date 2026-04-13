/**
 * @file weather-alert.module.ts
 * @description 기상청 기상특보 조회 모듈
 *
 * 풍랑특보, 강풍특보, 태풍특보 등 해양 관련 기상특보를
 * 실시간으로 조회하여 서핑 스팟별 위험 경고를 제공합니다.
 *
 * 데이터 출처: 기상청 기상특보조회서비스 (공공데이터포털)
 * End Point: http://apis.data.go.kr/1360000/WthrWrnInfoService
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WeatherAlertService } from './weather-alert.service';
import { WeatherAlertController } from './weather-alert.controller';

@Module({
  imports: [HttpModule],
  providers: [WeatherAlertService],
  controllers: [WeatherAlertController],
  exports: [WeatherAlertService],
})
export class WeatherAlertModule {}
