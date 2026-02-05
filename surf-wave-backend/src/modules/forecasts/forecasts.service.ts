import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Forecast } from './entities/forecast.entity';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { OpenMeteoProvider } from './providers/open-meteo.provider';
import { SpotsService } from '../spots/spots.service';

@Injectable()
export class ForecastsService {
  private readonly logger = new Logger(ForecastsService.name);

  constructor(
    @InjectRepository(Forecast)
    private readonly forecastRepository: Repository<Forecast>,
    private readonly openMeteoProvider: OpenMeteoProvider,
    private readonly spotsService: SpotsService,
    // @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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

    // Calculate surf rating based on conditions
    const surfRating = this.calculateSurfRating(forecast);
    const recommendation = this.getRecommendation(surfRating);

    return {
      ...forecast,
      surfRating,
      recommendation,
    };
  }

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

    // Group by day and create summary
    const dailySummaries = this.groupByDay(forecasts);
    return dailySummaries;
  }

  // Scheduled task to fetch forecasts
  @Cron(CronExpression.EVERY_30_MINUTES)
  async fetchAllForecasts() {
    this.logger.log('Starting scheduled forecast fetch...');
    // TODO: Implement fetching for all active spots
  }

  private calculateSurfRating(forecast: Forecast): number {
    // Simple rating based on wave height and wind
    let rating = 5;

    // Wave height factor
    if (forecast.waveHeight < 0.5) rating -= 2;
    else if (forecast.waveHeight > 2.5) rating -= 1;

    // Wind factor
    if (forecast.windSpeed > 30) rating -= 2;
    else if (forecast.windSpeed > 20) rating -= 1;

    // Wave period factor
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
        dayForecasts.reduce((sum, f) => sum + f.windSpeed, 0) /
        dayForecasts.length,
      surfRating:
        dayForecasts.reduce((sum, f) => sum + this.calculateSurfRating(f), 0) /
        dayForecasts.length,
    }));
  }
}
