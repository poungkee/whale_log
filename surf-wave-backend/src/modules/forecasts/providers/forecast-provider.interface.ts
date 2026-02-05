export interface ForecastData {
  forecastTime: Date;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  windSpeed: number;
  windGusts: number;
  windDirection: string;
  tideHeight: number;
  tideStatus: string;
  waterTemperature?: number;
  airTemperature?: number;
  weatherCondition?: string;
}

export interface ForecastProvider {
  /**
   * Fetch forecast data for a specific location
   * @param latitude Spot latitude
   * @param longitude Spot longitude
   * @param hours Number of hours to forecast
   * @returns Array of forecast data points
   */
  fetchForecast(
    latitude: number,
    longitude: number,
    hours: number,
  ): Promise<ForecastData[]>;

  /**
   * Provider name for logging/tracking
   */
  getProviderName(): string;
}
