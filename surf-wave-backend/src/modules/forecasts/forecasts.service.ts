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
import { Repository, Between, LessThanOrEqual, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Forecast } from './entities/forecast.entity';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { ForecastData } from './providers/forecast-provider.interface';
import { OpenMeteoProvider } from './providers/open-meteo.provider';
import { SpotsService } from '../spots/spots.service';
import { Difficulty } from '../../common/enums/difficulty.enum';
import { TideStatus } from '../../common/enums';
import {
  calculateSurfRating,
  getSimpleCondition,
  SpotForRating,
  ForecastForRating,
} from './utils/surf-rating.util';
import { generatePublicHints, generateHints, type Hints } from './utils/hints.util';
import { UserBoardType } from '../../common/enums/user-board-type.enum';

@Injectable()
export class ForecastsService {
  private readonly logger = new Logger(ForecastsService.name);
  /** 크론 실행 중 여부 - 중복 실행 방지용 */
  private isRunning = false;

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
    /** 이전 크론이 아직 실행 중이면 스킵 */
    if (this.isRunning) {
      this.logger.warn('이전 예보 수집이 아직 진행 중입니다. 이번 크론 실행을 건너뜁니다.');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled forecast fetch...');

    try {
    const activeSpots = await this.spotsService.findAllActive();

    if (activeSpots.length === 0) {
      this.logger.warn('No active spots found, skipping forecast fetch');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    /** Rate Limit(429) 감지 시 배치 중단 플래그 */
    let rateLimited = false;

    /**
     * 배치 병렬 처리: 동시에 BATCH_SIZE개 스팟을 처리
     *
     * 순차 처리(97개 × 3~5초 = 5~8분) → 배치 병렬(97/5 × 3~5초 = 1~2분)
     * Open-Meteo 무료 API는 초당 ~10 요청 허용하므로 5개 동시 처리가 안전
     */
    const BATCH_SIZE = 5;

    for (let i = 0; i < activeSpots.length; i += BATCH_SIZE) {
      /** 429 감지된 경우 남은 배치 전부 스킵 */
      if (rateLimited) {
        failCount += Math.min(BATCH_SIZE, activeSpots.length - i);
        continue;
      }

      const batch = activeSpots.slice(i, i + BATCH_SIZE);

      /** 배치 내 스팟들을 병렬 처리 (Promise.allSettled로 개별 실패 허용) */
      const results = await Promise.allSettled(
        batch.map(async (spot) => {
          const forecastData = await this.openMeteoProvider.fetchForecast(
            Number(spot.latitude),
            Number(spot.longitude),
            168,
          );
          await this.upsertForecasts(spot.id, forecastData);
          return { spotName: spot.name, spotId: spot.id, count: forecastData.length };
        }),
      );

      /** 배치 결과 처리: 성공/실패 카운트 + 429 감지 */
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successCount++;
          this.logger.log(
            `Upserted ${result.value.count} forecasts for spot: ${result.value.spotName} (${result.value.spotId})`,
          );
        } else {
          failCount++;
          const err = result.reason as any;

          /** HTTP 429 감지 → 이후 배치 전부 중단 */
          if (err?.response?.status === 429 || err?.status === 429) {
            this.logger.error(
              `Rate limit(429) 감지 - 남은 ${activeSpots.length - successCount - failCount}개 스팟 스킵`,
            );
            rateLimited = true;
          } else {
            this.logger.error(
              `Failed to fetch forecast: ${err?.message || err}`,
            );
          }
        }
      }
    }

    this.logger.log(
      `Forecast fetch completed: ${successCount}/${activeSpots.length} success, ${failCount} failed`,
    );
    } finally {
      this.isRunning = false;
    }
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
          tideHeight: item.tideHeight ?? null,
          tideStatus: (item.tideStatus as TideStatus) ?? null,
          waterTemperature: item.waterTemperature ?? null,
          airTemperature: item.airTemperature ?? null,
          weatherCondition: item.weatherCondition ?? null,
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
            'tide_height',
            'tide_status',
            'water_temperature',
            'air_temperature',
            'weather_condition',
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
  async getDashboardData(level?: Difficulty, boardType?: UserBoardType) {
    const spots = await this.spotsService.findAllActiveForDashboard(level);
    const now = new Date();

    /** 예보 데이터 최대 유효 시간 (1시간) - 이 이상 오래되면 stale로 표시 */
    const MAX_FORECAST_AGE_MS = 60 * 60 * 1000;

    /**
     * 단일 쿼리로 모든 스팟의 최신 예보 조회 (N+1 → 1 최적화)
     *
     * DISTINCT ON (spot_id) + ORDER BY forecast_time DESC로
     * 각 스팟별 현재 시각 이전 가장 최근 예보 1건만 가져옴.
     * 기존: 97개 스팟 × 개별 findOne 쿼리 = 97회 DB 호출
     * 변경: 1회 쿼리로 전부 조회
     */
    const spotIds = spots.map((s) => s.id);
    let forecastMap = new Map<string, Forecast>();

    if (spotIds.length > 0) {
      const latestForecasts = await this.forecastRepository
        .createQueryBuilder('f')
        .distinctOn(['f.spotId'])
        .where('f.spotId IN (:...spotIds)', { spotIds })
        .andWhere('f.forecastTime <= :now', { now })
        .orderBy('f.spotId', 'ASC')
        .addOrderBy('f.forecastTime', 'DESC')
        .getMany();

      /** spotId → Forecast 매핑 (계산 루프에서 O(1) 접근) */
      forecastMap = new Map(
        latestForecasts.map((f) => [f.spotId, f]),
      );
    }

    /** 각 스팟별 서핑 적합도 계산 (DB 호출 없이 순수 계산만) */
    const results = spots.map((spot) => {
      const forecast = forecastMap.get(spot.id) || null;

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
          hints: { tags: [], message: '예보 데이터가 없습니다.' } as Hints,
        };
      }

      /** 데이터 오래됨(stale) 판별 - fetchedAt 기준 */
      const forecastAge = now.getTime() - forecast.fetchedAt.getTime();
      const isStale = forecastAge > MAX_FORECAST_AGE_MS;

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
        swellHeight: forecast.swellHeight != null ? Number(forecast.swellHeight) : null,
        swellPeriod: forecast.swellPeriod != null ? Number(forecast.swellPeriod) : null,
        waterTemperature: forecast.waterTemperature != null ? Number(forecast.waterTemperature) : null,
        windSpeed: forecast.windSpeed != null ? Number(forecast.windSpeed) : null,
        windGusts: forecast.windGusts != null ? Number(forecast.windGusts) : null,
        windDirection: forecast.windDirection != null ? Number(forecast.windDirection) : null,
      };

      /** v1.3 계산 실행: 하드블록 → fit점수 → 가중합 → 메시지 */
      const ratingResult = calculateSurfRating(spotData, forecastData, level);

      /** 간단한 컨디션 요약 (파도/바람/전체 상태) */
      const simpleCondition = getSimpleCondition(forecastData);

      /** stale 데이터일 때 추천 문구에 경고 추가 */
      const recommendation = isStale
        ? `(오래된 데이터) ${ratingResult.recommendationKo}`
        : ratingResult.recommendationKo;

      /** C-7 hints 생성 - boardType이 있으면 보드별 팁 포함, 없으면 공통 메시지만 */
      const hintsInput = {
        detail: ratingResult.detail,
        surfRating: ratingResult.surfRating,
        safetyReasons: ratingResult.safetyReasons,
        waveHeight: forecastData.waveHeight,
        windSpeed: forecastData.windSpeed,
        wavePeriod: forecastData.wavePeriod,
      };

      const hints: Hints = boardType && boardType !== UserBoardType.UNSET
        ? generateHints({ ...hintsInput, boardType })
        : generatePublicHints(hintsInput);

      return {
        spot,
        forecast,
        surfRating: ratingResult.surfRating,
        levelFit: ratingResult.levelFit,
        detail: ratingResult.detail,
        recommendationKo: recommendation,
        safetyReasons: ratingResult.safetyReasons,
        simpleCondition,
        hints,
      };
    });

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

  // ============================================================
  // 크론: 매일 자정 오래된 예보 데이터 정리
  // ============================================================

  /**
   * 7일 이상 지난 과거 예보 데이터를 삭제합니다.
   *
   * upsert 방식이라 대부분 UPDATE지만, 시간이 지나면서
   * 과거 forecast_time 행들이 조회에 사용되지 않고 누적됨.
   * - 증가량: ~2,300행/일 (97스팟 × 24시간)
   * - 7일 이전 데이터: 어떤 조회에서도 사용하지 않음
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldForecasts() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      const result = await this.forecastRepository.delete({
        forecastTime: LessThan(cutoffDate),
      });

      this.logger.log(
        `오래된 예보 정리 완료: ${result.affected ?? 0}건 삭제 (기준: ${cutoffDate.toISOString()})`,
      );
    } catch (error) {
      this.logger.error(
        `오래된 예보 정리 실패: ${(error as Error).message}`,
      );
    }
  }
}
