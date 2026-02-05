import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ForecastProvider, ForecastData } from './forecast-provider.interface';

@Injectable()
export class OpenMeteoProvider implements ForecastProvider {
  private readonly logger = new Logger(OpenMeteoProvider.name);
  private readonly baseUrl = 'https://marine-api.open-meteo.com/v1/marine';

  constructor(private readonly httpService: HttpService) {}

  getProviderName(): string {
    return 'open-meteo';
  }

  async fetchForecast(
    latitude: number,
    longitude: number,
    hours: number,
  ): Promise<ForecastData[]> {
    try {
      const params = {
        latitude,
        longitude,
        hourly: [
          'wave_height',
          'wave_period',
          'wave_direction',
          'wind_wave_height',
          'wind_wave_period',
          'swell_wave_height',
          'swell_wave_period',
        ].join(','),
        forecast_days: Math.ceil(hours / 24),
      };

      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, { params }),
      );

      return this.transformResponse(response.data, hours);
    } catch (error) {
      this.logger.error(`Failed to fetch forecast: ${error.message}`);
      throw error;
    }
  }

  private transformResponse(data: any, hours: number): ForecastData[] {
    const hourly = data.hourly;
    const forecasts: ForecastData[] = [];

    const count = Math.min(hours, hourly.time?.length || 0);

    for (let i = 0; i < count; i++) {
      forecasts.push({
        forecastTime: new Date(hourly.time[i]),
        waveHeight: hourly.wave_height?.[i] || 0,
        wavePeriod: hourly.wave_period?.[i] || 0,
        waveDirection: hourly.wave_direction?.[i] || 0,
        windSpeed: 0, // Open-Meteo Marine doesn't include wind, would need separate API
        windGusts: 0,
        windDirection: 'N',
        tideHeight: 0,
        tideStatus: 'RISING',
        waterTemperature: undefined,
        airTemperature: undefined,
        weatherCondition: undefined,
      });
    }

    return forecasts;
  }
}
