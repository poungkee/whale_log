/**
 * @file forecasts.controller.ts
 * @description 예보 컨트롤러 - 스팟별 파도/날씨 예보 조회 API
 *
 * @endpoints
 * - GET /spots/:spotId/forecast - 스팟별 예보 데이터 조회
 */
import { Controller, Get, Post, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ForecastsService } from './forecasts.service';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('forecasts')
@ApiBearerAuth()
@Controller('spots/:spotId/forecast')
export class ForecastsController {
  constructor(private readonly forecastsService: ForecastsService) {}

  @Get()
  @ApiOperation({ summary: 'Get hourly forecast for spot' })
  async getHourlyForecast(
    @Param('spotId', ParseUUIDPipe) spotId: string,
    @Query() query: ForecastQueryDto,
  ) {
    return this.forecastsService.getHourlyForecast(spotId, query);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current forecast for spot' })
  async getCurrentForecast(@Param('spotId', ParseUUIDPipe) spotId: string) {
    return this.forecastsService.getCurrentForecast(spotId);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Get 7-day forecast summary for spot' })
  async getWeeklyForecast(@Param('spotId', ParseUUIDPipe) spotId: string) {
    return this.forecastsService.getWeeklyForecast(spotId);
  }
}

/** 예보 수동 트리거용 컨트롤러 (개발/운영 관리용) */
@ApiTags('forecasts')
@Controller('forecasts')
export class ForecastAdminController {
  constructor(private readonly forecastsService: ForecastsService) {}

  /** 수동으로 전체 스팟 예보 수집 트리거 */
  @Post('fetch-now')
  @Public()
  @ApiOperation({ summary: '수동 예보 수집 트리거 (전체 active 스팟)' })
  async triggerFetchNow() {
    await this.forecastsService.fetchAllForecasts();
    return { message: '예보 수집 완료' };
  }
}
