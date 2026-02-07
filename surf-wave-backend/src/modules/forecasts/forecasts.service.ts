/**
 * @file forecasts.service.ts
 * @description 예보 서비스
 *
 * 예보 데이터의 핵심 비즈니스 로직을 담당합니다.
 * - 30분 크론: active spots 루프 → Open-Meteo API 호출 → DB upsert
 * - 조회: 시간별/현재/주간 예보 + 서핑 적합도 계산
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

  /** 현재 시각 기준 최신 예보 + 서핑 적합도 */
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

    const surfRating = this.calculateSurfRating(forecast);
    const recommendation = this.getRecommendation(surfRating);

    return {
      ...forecast,
      surfRating,
      recommendation,
    };
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
  // 서핑 적합도 계산 (단순 룰 v0)
  // ============================================================

  private calculateSurfRating(forecast: Forecast): number {
    let rating = 5;

    // 파고 기준
    if (forecast.waveHeight < 0.5) rating -= 2;
    else if (forecast.waveHeight > 2.5) rating -= 1;

    // 풍속 기준 (nullable 대응)
    if (forecast.windSpeed != null) {
      if (forecast.windSpeed > 30) rating -= 2;
      else if (forecast.windSpeed > 20) rating -= 1;
    }

    // 파주기 기준
    if (forecast.wavePeriod < 6) rating -= 1;
    else if (forecast.wavePeriod > 10) rating += 1;

    return Math.max(1, Math.min(5, rating));
  }

  private getRecommendation(rating: number): string {
    if (rating >= 4) return 'Perfect conditions for surfing!';
    if (rating >= 3) return 'Good conditions, enjoy your session.';
    if (rating >= 2) return 'Moderate conditions, suitable for intermediate surfers.';
    return 'Poor conditions, consider waiting for better waves.';
  }

  /** 대시보드용: 전체 스팟의 현재 예보 + 서핑 적합도 반환 */
  async getDashboardData(level?: Difficulty) {
    const spots = await this.spotsService.findAllActiveForDashboard(level);
    const now = new Date();

    const results = await Promise.all(
      spots.map(async (spot) => {
        const forecast = await this.forecastRepository.findOne({
          where: {
            spotId: spot.id,
            forecastTime: LessThanOrEqual(now),
          },
          order: { forecastTime: 'DESC' },
        });

        if (!forecast) {
          return {
            spot,
            forecast: null,
            surfRating: 0,
            recommendation: 'No data',
            recommendationKo: '데이터 없음',
            simpleCondition: null,
          };
        }

        const surfRating = this.calculateSurfRating(forecast);
        const recommendation = this.getRecommendation(surfRating);
        const recommendationKo = this.getRecommendationKo(surfRating);
        const simpleCondition = this.getSimpleCondition(forecast);

        return { spot, forecast, surfRating, recommendation, recommendationKo, simpleCondition };
      }),
    );

    return {
      fetchedAt: now.toISOString(),
      totalSpots: spots.length,
      spots: results,
    };
  }

  private getRecommendationKo(rating: number): string {
    if (rating >= 5) return '완벽한 서핑 컨디션이에요!';
    if (rating >= 4) return '서핑하기 좋은 날이에요!';
    if (rating >= 3) return '무난한 컨디션이에요';
    if (rating >= 2) return '중급 이상 서퍼에게 적합해요';
    return '오늘은 쉬는 게 좋겠어요';
  }

  private getSimpleCondition(forecast: Forecast): {
    waveStatus: string;
    windStatus: string;
    overall: string;
  } {
    const wh = Number(forecast.waveHeight);
    let waveStatus: string;
    if (wh < 0.5) waveStatus = '잔잔';
    else if (wh <= 1.5) waveStatus = '적당';
    else if (wh <= 2.5) waveStatus = '높음';
    else waveStatus = '위험';

    const ws = Number(forecast.windSpeed ?? 0);
    let windStatus: string;
    if (ws < 10) windStatus = '약함';
    else if (ws <= 20) windStatus = '보통';
    else if (ws <= 30) windStatus = '강함';
    else windStatus = '매우 강함';

    let overall: string;
    if (wh >= 0.5 && wh <= 1.5 && ws < 20) overall = '좋음';
    else if (wh > 2.5 || ws > 30) overall = '주의';
    else overall = '보통';

    return { waveStatus, windStatus, overall };
  }

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
      surfRating:
        dayForecasts.reduce((sum, f) => sum + this.calculateSurfRating(f), 0) /
        dayForecasts.length,
    }));
  }
}
