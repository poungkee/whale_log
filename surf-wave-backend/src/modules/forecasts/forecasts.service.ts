/**
 * @file forecasts.service.ts
 * @description 예보 서비스 (v1.3 계산 로직 적용)
 *
 * 예보 데이터의 핵심 비즈니스 로직을 담당합니다.
 * - 30분 크론: active spots 루프 → Open-Meteo API 호출 → DB upsert
 * - 조회: 시간별/현재/주간 예보 + 서핑 적합도 계산
 *
 * v1.3 변경사항:
 * - 기존 v0 단순 감점 방식(1~5점) → 5개 항목 fit 기반 가중합(0~10점)
 * - 하드블록 안전 필터 추가 (reef+BEGINNER 차단 등)
 * - 스팟 특성(breakType, coastFacingDeg) 반영
 * - gust(돌풍) 반영, 풍향 from→to 변환
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Forecast } from './entities/forecast.entity';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { ForecastData } from './providers/forecast-provider.interface';
import { OpenMeteoProvider } from './providers/open-meteo.provider';
import { SpotsService } from '../spots/spots.service';
import { Difficulty } from '../../common/enums/difficulty.enum';
import {
  calculateSurfRating,
  getSimpleCondition,
  SpotForRating,
  ForecastForRating,
} from './utils/surf-rating.util';

@Injectable()
export class ForecastsService {
  private readonly logger = new Logger(ForecastsService.name);

  constructor(
    @InjectRepository(Forecast)
    private readonly forecastRepository: Repository<Forecast>,
    private readonly openMeteoProvider: OpenMeteoProvider,
    private readonly spotsService: SpotsService,
  ) {}

  // ============================================================
  // 조회 API
  // ============================================================

  /** 시간별 예보 조회 (기본 24시간, 최대 168시간) */
  async getHourlyForecast(spotId: string, query: ForecastQueryDto) {
    const { date, hours = 24 } = query;
    const startTime = date ? new Date(date) : new Date();
    const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

    const forecasts = await this.forecastRepository.find({
      where: {
        spotId,
        forecastTime: Between(startTime, endTime),
      },
      order: { forecastTime: 'ASC' },
    });

    return forecasts;
  }

  /**
   * 현재 시각 기준 최신 예보 반환
   * (개별 스팟 조회용 - 점수 계산은 대시보드에서 수행)
   */
  async getCurrentForecast(spotId: string) {
    const now = new Date();

    const forecast = await this.forecastRepository.findOne({
      where: {
        spotId,
        forecastTime: LessThanOrEqual(now),
      },
      order: { forecastTime: 'DESC' },
    });

    if (!forecast) {
      throw new NotFoundException('No forecast data available');
    }

    return forecast;
  }

  /** 7일 주간 예보 요약 (일별 min/max/avg) */
  async getWeeklyForecast(spotId: string) {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const forecasts = await this.forecastRepository.find({
      where: {
        spotId,
        forecastTime: Between(now, weekLater),
      },
      order: { forecastTime: 'ASC' },
    });

    const dailySummaries = this.groupByDay(forecasts);
    return dailySummaries;
  }

  // ============================================================
  // 크론: 30분마다 전체 active spots 예보 수집
  // ============================================================

  @Cron(CronExpression.EVERY_30_MINUTES)
  async fetchAllForecasts() {
    this.logger.log('Starting scheduled forecast fetch...');

    const activeSpots = await this.spotsService.findAllActive();

    if (activeSpots.length === 0) {
      this.logger.warn('No active spots found, skipping forecast fetch');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const spot of activeSpots) {
      try {
        // 7일(168시간) 예보 수집
        const forecastData = await this.openMeteoProvider.fetchForecast(
          Number(spot.latitude),
          Number(spot.longitude),
          168,
        );

        await this.upsertForecasts(spot.id, forecastData);
        successCount++;

        this.logger.log(
          `Upserted ${forecastData.length} forecasts for spot: ${spot.name} (${spot.id})`,
        );
      } catch (error) {
        failCount++;
        this.logger.error(
          `Failed to fetch forecast for spot: ${spot.name} (${spot.id}) - ${(error as Error).message}`,
        );
        // spot 단위 실패 → 다음 스팟으로 계속 진행
      }
    }

    this.logger.log(
      `Forecast fetch completed: ${successCount}/${activeSpots.length} success, ${failCount} failed`,
    );
  }

  // ============================================================
  // Upsert: (spot_id, forecast_time) 기준으로 INSERT or UPDATE
  // ============================================================

  private async upsertForecasts(
    spotId: string,
    data: ForecastData[],
  ): Promise<void> {
    const now = new Date();

    for (const item of data) {
      await this.forecastRepository
        .createQueryBuilder()
        .insert()
        .into(Forecast)
        .values({
          spotId,
          forecastTime: item.forecastTime,
          waveHeight: item.waveHeight,
          wavePeriod: item.wavePeriod,
          waveDirection: item.waveDirection,
          swellHeight: item.swellHeight ?? null,
          swellPeriod: item.swellPeriod ?? null,
          swellDirection: item.swellDirection ?? null,
          windSpeed: item.windSpeed ?? null,
          windGusts: item.windGusts ?? null,
          windDirection: item.windDirection ?? null,
          fetchedAt: now,
          source: 'open-meteo',
        })
        .orUpdate(
          [
            'wave_height',
            'wave_period',
            'wave_direction',
            'swell_height',
            'swell_period',
            'swell_direction',
            'wind_speed',
            'wind_gusts',
            'wind_direction',
            'fetched_at',
          ],
          ['spot_id', 'forecast_time'],
        )
        .execute();
    }
  }

  // ============================================================
  // 서핑 적합도 계산 (v1.3 - surf-rating.util.ts 사용)
  // ============================================================

  /**
   * 대시보드용: 전체 스팟의 현재 예보 + v1.3 서핑 적합도 반환
   *
   * v1.3 변경사항:
   * - surfRating: 0~10점 (기존 1~5점에서 변경)
   * - levelFit: BEGINNER/INTERMEDIATE/ADVANCED별 PASS/WARNING/BLOCKED
   * - detail: 5개 항목별 상세 점수 (waveFit, periodFit, windSpeedFit, swellFit, windDirFit)
   * - safetyReasons: 안전 경고 사유 배열 (하드블록 시 여러 이유 축적)
   * - simpleCondition: 파도/바람/전체 상태 요약
   */
  async getDashboardData(level?: Difficulty) {
    const spots = await this.spotsService.findAllActiveForDashboard(level);
    const now = new Date();

    const results = await Promise.all(
      spots.map(async (spot) => {
        /** 현재 시각 기준 최신 예보 조회 */
        const forecast = await this.forecastRepository.findOne({
          where: {
            spotId: spot.id,
            forecastTime: LessThanOrEqual(now),
          },
          order: { forecastTime: 'DESC' },
        });

        /** 예보 데이터 없는 스팟: 기본값 반환 */
        if (!forecast) {
          return {
            spot,
            forecast: null,
            surfRating: 0,
            levelFit: { BEGINNER: 'PASS', INTERMEDIATE: 'PASS', ADVANCED: 'PASS' },
            detail: null,
            recommendationKo: '데이터 없음',
            safetyReasons: [],
            simpleCondition: null,
          };
        }

        /**
         * 스팟 데이터를 계산 유틸 입력 형태로 변환
         * TypeORM decimal 컬럼은 문자열로 반환되므로 Number() 변환 필요
         */
        const spotData: SpotForRating = {
          breakType: spot.breakType,
          difficulty: spot.difficulty,
          coastFacingDeg: spot.coastFacingDeg,
          bestSwellDirection: spot.bestSwellDirection,
          bestSwellSpreadDeg: spot.bestSwellSpreadDeg,
          optimalWaveMin: spot.optimalWaveMin,
          optimalWaveMax: spot.optimalWaveMax,
          tolerableWaveMin: spot.tolerableWaveMin,
          tolerableWaveMax: spot.tolerableWaveMax,
        };

        /**
         * 예보 데이터를 계산 유틸 입력 형태로 변환
         * ⚠️ windDirection은 "FROM" 방향 (기상 데이터 표준)
         * → surf-rating.util.ts 내부에서 TO 방향으로 변환 후 사용
         */
        const forecastData: ForecastForRating = {
          waveHeight: Number(forecast.waveHeight),
          wavePeriod: Number(forecast.wavePeriod),
          waveDirection: Number(forecast.waveDirection),
          swellDirection: forecast.swellDirection != null ? Number(forecast.swellDirection) : null,
          windSpeed: forecast.windSpeed != null ? Number(forecast.windSpeed) : null,
          windGusts: forecast.windGusts != null ? Number(forecast.windGusts) : null,
          windDirection: forecast.windDirection != null ? Number(forecast.windDirection) : null,
        };

        /** v1.3 계산 실행: 하드블록 → fit점수 → 가중합 → 메시지 */
        const ratingResult = calculateSurfRating(spotData, forecastData, level);

        /** 간단한 컨디션 요약 (파도/바람/전체 상태) */
        const simpleCondition = getSimpleCondition(forecastData);

        return {
          spot,
          forecast,
          surfRating: ratingResult.surfRating,
          levelFit: ratingResult.levelFit,
          detail: ratingResult.detail,
          recommendationKo: ratingResult.recommendationKo,
          safetyReasons: ratingResult.safetyReasons,
          simpleCondition,
        };
      }),
    );

    return {
      fetchedAt: now.toISOString(),
      totalSpots: spots.length,
      spots: results,
    };
  }

  /**
   * 주간 예보 요약 (일별 min/max/avg)
   * groupByDay 내부에서도 v1.3 점수를 사용할 수 있지만,
   * 주간 요약은 스팟 정보 없이 forecast만으로 계산하므로
   * 간단한 평균 점수만 제공 (상세 fit은 대시보드에서 제공)
   */
  private groupByDay(forecasts: Forecast[]) {
    const grouped = new Map<string, Forecast[]>();

    forecasts.forEach((f) => {
      const date = f.forecastTime.toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(f);
    });

    return Array.from(grouped.entries()).map(([date, dayForecasts]) => ({
      date,
      minWaveHeight: Math.min(...dayForecasts.map((f) => f.waveHeight)),
      maxWaveHeight: Math.max(...dayForecasts.map((f) => f.waveHeight)),
      avgWavePeriod:
        dayForecasts.reduce((sum, f) => sum + f.wavePeriod, 0) /
        dayForecasts.length,
      avgWindSpeed:
        dayForecasts.reduce((sum, f) => sum + (f.windSpeed ?? 0), 0) /
        dayForecasts.length,
      /** 주간 요약에서는 파고/주기/풍속 기반 간이 점수 사용 */
      avgWaveHeight:
        dayForecasts.reduce((sum, f) => sum + Number(f.waveHeight), 0) /
        dayForecasts.length,
    }));
  }
}
