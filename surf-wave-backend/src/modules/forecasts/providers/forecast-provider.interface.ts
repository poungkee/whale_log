/**
 * @file forecast-provider.interface.ts
 * @description 예보 프로바이더 인터페이스
 *
 * 외부 예보 API의 공통 계약(contract)을 정의합니다.
 * 현재 구현체: OpenMeteoProvider (Marine API + Weather API)
 */

/** 시간대별 예보 데이터 (1시간 = 1개) */
export interface ForecastData {
  /** 예보 시각 (ISO 8601) */
  forecastTime: Date;

  // ---- 파도 (Marine API) ----
  /** 전체 파도 높이 (m) */
  waveHeight: number;
  /** 파도 주기 (s) */
  wavePeriod: number;
  /** 파도 방향 (degree, 0-360) */
  waveDirection: number;

  // ---- 스웰 (Marine API) ----
  /** 스웰 높이 (m) */
  swellHeight?: number | null;
  /** 스웰 주기 (s) */
  swellPeriod?: number | null;
  /** 스웰 방향 (degree, 0-360) */
  swellDirection?: number | null;

  // ---- 바람 (Weather API) ----
  /** 풍속 10m (km/h) */
  windSpeed?: number | null;
  /** 돌풍 10m (km/h) */
  windGusts?: number | null;
  /** 풍향 (degree, 0-360) */
  windDirection?: number | null;

  // ---- 조석 (Marine API) ----
  /** 조위 - 해수면 높이 MSL 기준 (m) */
  tideHeight?: number | null;
  /** 조석 상태 (HIGH/LOW/RISING/FALLING) */
  tideStatus?: string | null;
  /** 수온 (C) */
  waterTemperature?: number | null;
  /** 기온 (C) */
  airTemperature?: number | null;
  /** 날씨 상태 */
  weatherCondition?: string | null;
}

export interface ForecastProvider {
  /**
   * 특정 좌표의 예보 데이터를 가져옵니다.
   * @param latitude 위도
   * @param longitude 경도
   * @param hours 예보 시간 수 (최대 168 = 7일)
   * @returns 시간대별 예보 데이터 배열
   */
  fetchForecast(
    latitude: number,
    longitude: number,
    hours: number,
  ): Promise<ForecastData[]>;

  /** 프로바이더 이름 (로그/추적용) */
  getProviderName(): string;
}
