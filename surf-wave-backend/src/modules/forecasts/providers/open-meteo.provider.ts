/**
 * @file open-meteo.provider.ts
 * @description Open-Meteo 예보 프로바이더
 *
 * 2개 API를 병렬 호출하여 파도/스웰/바람 데이터를 수집합니다.
 * - Marine API (marine-api.open-meteo.com): 파도 높이/주기/방향, 스웰
 * - Weather API (api.open-meteo.com): 풍속/돌풍/풍향
 *
 * 두 API의 hourly.time 배열을 키로 머지하여 ForecastData[]를 반환합니다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ForecastProvider, ForecastData } from './forecast-provider.interface';

@Injectable()
export class OpenMeteoProvider implements ForecastProvider {
  private readonly logger = new Logger(OpenMeteoProvider.name);
  private readonly marineUrl = 'https://marine-api.open-meteo.com/v1/marine';
  private readonly weatherUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor(private readonly httpService: HttpService) {}

  getProviderName(): string {
    return 'open-meteo';
  }

  /**
   * 파도/스웰/바람 예보 데이터를 가져옵니다.
   * Marine API + Weather API를 병렬 호출 후 time 키로 머지합니다.
   * Weather API 실패 시 바람 데이터만 null로 처리하고 파도 데이터는 유지합니다.
   */
  async fetchForecast(
    latitude: number,
    longitude: number,
    hours: number,
  ): Promise<ForecastData[]> {
    const forecastDays = Math.ceil(hours / 24);

    // Marine API는 필수, Weather API는 실패해도 계속 진행
    const [marineData, weatherData] = await Promise.all([
      this.fetchMarineData(latitude, longitude, forecastDays),
      this.fetchWeatherData(latitude, longitude, forecastDays).catch(
        (error) => {
          this.logger.warn(
            `Weather API failed, wind data will be null: ${(error as Error).message}`,
          );
          return null;
        },
      ),
    ]);

    return this.mergeResponses(marineData, weatherData, hours);
  }

  /**
   * Marine API 호출 - 파도/스웰 데이터
   */
  private async fetchMarineData(
    latitude: number,
    longitude: number,
    forecastDays: number,
  ): Promise<any> {
    const params = {
      latitude,
      longitude,
      hourly: [
        'wave_height',
        'wave_period',
        'wave_direction',
        'swell_wave_height',
        'swell_wave_period',
        'swell_wave_direction',
      ].join(','),
      timezone: 'auto',
      forecast_days: forecastDays,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.marineUrl, { params }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Marine API failed: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Weather API 호출 - 바람/돌풍 데이터
   */
  private async fetchWeatherData(
    latitude: number,
    longitude: number,
    forecastDays: number,
  ): Promise<any> {
    const params = {
      latitude,
      longitude,
      hourly: [
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      timezone: 'auto',
      forecast_days: forecastDays,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.weatherUrl, { params }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Weather API failed: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Marine + Weather 응답을 time 키 기준으로 머지합니다.
   * Marine의 hourly.time을 기준 타임라인으로 사용하고,
   * Weather의 wind 데이터를 Map으로 만들어 같은 time 슬롯에 채웁니다.
   */
  private mergeResponses(
    marineData: any,
    weatherData: any | null,
    hours: number,
  ): ForecastData[] {
    const marine = marineData.hourly;

    // Weather 데이터를 time -> wind 맵으로 변환
    const windMap = new Map<
      string,
      { speed: number | null; gusts: number | null; direction: number | null }
    >();

    if (weatherData?.hourly) {
      const weather = weatherData.hourly;
      weather.time.forEach((t: string, i: number) => {
        windMap.set(t, {
          speed: weather.wind_speed_10m?.[i] ?? null,
          gusts: weather.wind_gusts_10m?.[i] ?? null,
          direction: weather.wind_direction_10m?.[i] ?? null,
        });
      });
    }

    // Marine 타임라인 기준으로 순회하며 합침
    const count = Math.min(hours, marine.time?.length || 0);
    const forecasts: ForecastData[] = [];

    for (let i = 0; i < count; i++) {
      const time = marine.time[i];
      const wind = windMap.get(time);

      forecasts.push({
        forecastTime: new Date(time),
        // 파도
        waveHeight: marine.wave_height?.[i] ?? 0,
        wavePeriod: marine.wave_period?.[i] ?? 0,
        waveDirection: marine.wave_direction?.[i] ?? 0,
        // 스웰
        swellHeight: marine.swell_wave_height?.[i] ?? null,
        swellPeriod: marine.swell_wave_period?.[i] ?? null,
        swellDirection: marine.swell_wave_direction?.[i] ?? null,
        // 바람 (Weather API에서 가져옴, 없으면 null)
        windSpeed: wind?.speed ?? null,
        windGusts: wind?.gusts ?? null,
        windDirection: wind?.direction ?? null,
      });
    }

    return forecasts;
  }
}
