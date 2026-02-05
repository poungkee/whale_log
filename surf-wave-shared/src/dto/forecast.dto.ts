import { TideStatus, WindDirection } from '../enums';

export interface ForecastResponse {
  id: string;
  spotId: string;
  forecastTime: string;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  windSpeed: number;
  windGusts: number;
  windDirection: WindDirection;
  tideHeight: number;
  tideStatus: TideStatus;
  waterTemperature: number | null;
  airTemperature: number | null;
  weatherCondition: string | null;
  source: string;
}

export interface CurrentForecastResponse extends ForecastResponse {
  spotName: string;
  surfRating: number;
  recommendation: string;
}

export interface WeeklyForecastSummary {
  date: string;
  minWaveHeight: number;
  maxWaveHeight: number;
  avgWavePeriod: number;
  avgWindSpeed: number;
  dominantWindDirection: WindDirection;
  bestTime: string | null;
  surfRating: number;
}

export interface ForecastQuery {
  date?: string;
  hours?: number;
}
