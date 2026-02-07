# 파도 API 연동 및 DB 연동 작업

> **작성일**: 2026-02-07
> **프로젝트**: Whale Log
> **목표**: Open-Meteo API로 파도/스웰/바람 예보 데이터를 수집하여 DB에 저장하고, 조회 API 제공

---

## 1. 전체 흐름 요약

```
┌─────────────────────┐     ┌─────────────────────┐
│ Open-Meteo Marine   │     │ Open-Meteo Weather   │
│ (파도 + 스웰)        │     │ (바람 + 돌풍)         │
└────────┬────────────┘     └────────┬────────────┘
         │  Promise.all 병렬 호출      │
         └────────────┬───────────────┘
                      ▼
              ┌───────────────┐
              │ time 키 머지   │
              │ (같은 시간끼리) │
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │ DB Upsert     │
              │ (spot_id +    │
              │  forecast_time│
              │  기준)         │
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │ forecasts 테이블│
              └───────────────┘
```

**수집 주기**: 30분 크론 (`@Cron(EVERY_30_MINUTES)`)
**데이터 단위**: 시간별(hourly) 예보, 스팟당 최대 7일(168시간)

---

## 2. 데이터 소스

### 2.1 Open-Meteo Marine API

- **URL**: `https://marine-api.open-meteo.com/v1/marine`
- **제공 데이터**: 파도, 스웰
- **비용**: 무료, API Key 불필요

| 요청 파라미터 | 값 |
|--------------|-----|
| `latitude` | 스팟 위도 |
| `longitude` | 스팟 경도 |
| `hourly` | `wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction` |
| `timezone` | `auto` (스팟 위치 기준 자동) |
| `forecast_days` | `7` |

**응답 예시:**
```json
{
  "hourly": {
    "time": ["2026-02-07T00:00", "2026-02-07T01:00", ...],
    "wave_height": [1.2, 1.3, ...],
    "wave_period": [12, 13, ...],
    "wave_direction": [210, 215, ...],
    "swell_wave_height": [1.0, 1.1, ...],
    "swell_wave_period": [14, 15, ...],
    "swell_wave_direction": [200, 205, ...]
  }
}
```

### 2.2 Open-Meteo Weather API

- **URL**: `https://api.open-meteo.com/v1/forecast`
- **제공 데이터**: 바람, 돌풍
- **비용**: 무료, API Key 불필요

| 요청 파라미터 | 값 |
|--------------|-----|
| `latitude` | 스팟 위도 |
| `longitude` | 스팟 경도 |
| `hourly` | `wind_speed_10m,wind_direction_10m,wind_gusts_10m` |
| `timezone` | `auto` |
| `forecast_days` | `7` |

**응답 예시:**
```json
{
  "hourly": {
    "time": ["2026-02-07T00:00", "2026-02-07T01:00", ...],
    "wind_speed_10m": [13.7, 15.2, ...],
    "wind_direction_10m": [270, 265, ...],
    "wind_gusts_10m": [22.1, 25.3, ...]
  }
}
```

> **참고**: Weather API의 풍속 단위는 km/h

---

## 3. 수정 대상 파일 (4개)

| # | 파일 경로 | 작업 내용 |
|---|----------|----------|
| 1 | `forecasts/entities/forecast.entity.ts` | DB 스키마 변경 |
| 2 | `forecasts/providers/forecast-provider.interface.ts` | 인터페이스 수정 |
| 3 | `forecasts/providers/open-meteo.provider.ts` | API 호출 로직 구현 |
| 4 | `forecasts/forecasts.service.ts` | 크론 + upsert 로직 구현 |

---

## 4. 작업 순서

### Step 1: Forecast Entity 스키마 변경

**파일**: `src/modules/forecasts/entities/forecast.entity.ts`

**변경 사항:**

| 항목 | Before | After |
|------|--------|-------|
| swell_height | (없음) | `decimal(4,2)` nullable 추가 |
| swell_period | (없음) | `decimal(4,1)` nullable 추가 |
| swell_direction | (없음) | `decimal(5,2)` nullable 추가 |
| wind_direction | `enum(WindDirection)` NOT NULL | `decimal(5,2)` nullable |
| wind_speed | `decimal(5,2)` NOT NULL | nullable 전환 |
| wind_gusts | `decimal(5,2)` NOT NULL | nullable 전환 |
| tide_height | `decimal(4,2)` NOT NULL | nullable 전환 |
| tide_status | `enum(TideStatus)` NOT NULL | nullable 전환 |
| (spot_id, forecast_time) | INDEX만 존재 | **UNIQUE 제약 추가** |

**변경 후 MVP 필드 정리:**

```
필수 (NOT NULL):
  id, spot_id, forecast_time, wave_height, wave_period, wave_direction,
  fetched_at, source, created_at

선택 (nullable):
  swell_height, swell_period, swell_direction,        ← 신규
  wind_speed, wind_gusts, wind_direction,              ← nullable 전환
  tide_height, tide_status,                            ← nullable 전환
  water_temperature, air_temperature, weather_condition ← 기존 유지
```

**UNIQUE 제약 (upsert용):**
```
@Unique('UQ_forecast_spot_time', ['spotId', 'forecastTime'])
```

---

### Step 2: ForecastData 인터페이스 수정

**파일**: `src/modules/forecasts/providers/forecast-provider.interface.ts`

**변경 사항:**

```typescript
// Before
export interface ForecastData {
  forecastTime: Date;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  windSpeed: number;          // 필수
  windGusts: number;          // 필수
  windDirection: string;      // string 타입
  tideHeight: number;         // 필수
  tideStatus: string;         // 필수
  waterTemperature?: number;
  airTemperature?: number;
  weatherCondition?: string;
}

// After
export interface ForecastData {
  forecastTime: Date;
  // 파도 (Marine API)
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  // 스웰 (Marine API)
  swellHeight?: number;
  swellPeriod?: number;
  swellDirection?: number;
  // 바람 (Weather API)
  windSpeed?: number;
  windGusts?: number;
  windDirection?: number;     // degree (숫자)
  // Phase 2+
  tideHeight?: number;
  tideStatus?: string;
  waterTemperature?: number;
  airTemperature?: number;
  weatherCondition?: string;
}
```

**핵심 변경:**
- swell 3개 필드 추가
- wind 3개 필드 optional로 변경
- windDirection: `string` → `number` (degree)
- tide 2개 필드 optional로 변경

---

### Step 3: OpenMeteoProvider 구현

**파일**: `src/modules/forecasts/providers/open-meteo.provider.ts`

**전체 로직:**

```
fetchForecast(lat, lng, hours)
  │
  ├── fetchMarineData(lat, lng, days)   ← Marine API 호출
  ├── fetchWeatherData(lat, lng, days)  ← Weather API 호출
  │   (Promise.all 병렬)
  │
  └── mergeByTime(marineData, weatherData)
        │
        ├── marine.hourly.time을 기준 타임라인으로 사용
        ├── weather.hourly를 Map<time, windData>로 변환
        ├── 같은 time 슬롯에 wind 값 채움
        └── time 없으면 wind는 null (정상)
```

**구현 세부:**

```typescript
// 1. 두 API URL
private readonly marineUrl = 'https://marine-api.open-meteo.com/v1/marine';
private readonly weatherUrl = 'https://api.open-meteo.com/v1/forecast';

// 2. Marine API 요청 파라미터
marineParams = {
  latitude, longitude,
  hourly: 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction',
  timezone: 'auto',
  forecast_days: Math.ceil(hours / 24),
};

// 3. Weather API 요청 파라미터
weatherParams = {
  latitude, longitude,
  hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
  timezone: 'auto',
  forecast_days: Math.ceil(hours / 24),
};

// 4. 병렬 호출
const [marineRes, weatherRes] = await Promise.all([
  this.httpService.get(marineUrl, { params: marineParams }),
  this.httpService.get(weatherUrl, { params: weatherParams }),
]);

// 5. time 키 기준 머지
```

**머지 로직 상세:**

```typescript
private mergeResponses(marineData, weatherData, hours): ForecastData[] {
  const marine = marineData.hourly;
  const weather = weatherData.hourly;

  // Weather 데이터를 time -> wind 맵으로 변환
  const windMap = new Map<string, { speed: number; gusts: number; direction: number }>();
  weather.time.forEach((t, i) => {
    windMap.set(t, {
      speed: weather.wind_speed_10m[i],
      gusts: weather.wind_gusts_10m[i],
      direction: weather.wind_direction_10m[i],
    });
  });

  // Marine 타임라인 기준으로 순회하며 합침
  const count = Math.min(hours, marine.time.length);
  const forecasts: ForecastData[] = [];

  for (let i = 0; i < count; i++) {
    const time = marine.time[i];
    const wind = windMap.get(time);  // 매칭 안 되면 undefined → null

    forecasts.push({
      forecastTime: new Date(time),
      waveHeight: marine.wave_height[i] ?? 0,
      wavePeriod: marine.wave_period[i] ?? 0,
      waveDirection: marine.wave_direction[i] ?? 0,
      swellHeight: marine.swell_wave_height?.[i] ?? null,
      swellPeriod: marine.swell_wave_period?.[i] ?? null,
      swellDirection: marine.swell_wave_direction?.[i] ?? null,
      windSpeed: wind?.speed ?? null,
      windGusts: wind?.gusts ?? null,
      windDirection: wind?.direction ?? null,
    });
  }

  return forecasts;
}
```

**에러 처리:**
- Marine API 실패 → 에러 throw (파도 데이터 없으면 의미 없음)
- Weather API 실패 → wind 값만 null로, 나머지는 정상 저장 (파도 데이터는 살림)

```typescript
// Weather 실패 시에도 파도 데이터는 저장
let weatherData = null;
try {
  weatherData = await this.fetchWeatherData(lat, lng, days);
} catch (error) {
  this.logger.warn(`Weather API failed, wind data will be null: ${error.message}`);
}
```

---

### Step 4: ForecastsService 크론 + Upsert 구현

**파일**: `src/modules/forecasts/forecasts.service.ts`

**구현할 메서드: `fetchAllForecasts()`**

```
@Cron(EVERY_30_MINUTES)
fetchAllForecasts()
  │
  ├── 1. active spots 전체 조회
  │     spotsService.findAllActive()
  │
  ├── 2. spot별 루프
  │     for (const spot of activeSpots)
  │       │
  │       ├── try {
  │       │     openMeteoProvider.fetchForecast(lat, lng, 168)
  │       │     → ForecastData[] 반환
  │       │
  │       │     upsertForecasts(spot.id, forecastDataArray)
  │       │     → DB에 저장
  │       │   }
  │       │
  │       └── catch {
  │             logger.error(spotId + 에러 메시지)
  │             → 다음 스팟으로 계속 (전체 중단 X)
  │           }
  │
  └── 3. 완료 로그
        logger.log(`Fetched forecasts for ${success}/${total} spots`)
```

**Upsert 구현 (핵심):**

```typescript
private async upsertForecasts(spotId: string, data: ForecastData[]) {
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
        swellHeight: item.swellHeight,
        swellPeriod: item.swellPeriod,
        swellDirection: item.swellDirection,
        windSpeed: item.windSpeed,
        windGusts: item.windGusts,
        windDirection: item.windDirection,
        fetchedAt: now,
        source: 'open-meteo',
      })
      .orUpdate(
        [
          'wave_height', 'wave_period', 'wave_direction',
          'swell_height', 'swell_period', 'swell_direction',
          'wind_speed', 'wind_gusts', 'wind_direction',
          'fetched_at',
        ],
        ['spot_id', 'forecast_time'],  // UNIQUE 제약 기준
      )
      .execute();
  }
}
```

**Upsert 정책:**
- `(spot_id, forecast_time)` 기준으로 이미 있으면 UPDATE, 없으면 INSERT
- 매 크론마다 최신 예보로 덮어씀 (overwrite)
- null로 기존 값 덮어쓰기 방지는 **하지 않음** (심플하게 전체 갱신)
  - 이유: 30분마다 두 API를 같이 호출하므로 정상 시 null이 올 일이 적음
  - Weather 실패 시 wind만 null → 다음 크론에서 복구됨

**SpotsService에 추가 필요한 메서드:**

```typescript
// spots.service.ts에 추가
async findAllActive(): Promise<Spot[]> {
  return this.spotRepository.find({
    where: { isActive: true },
    select: ['id', 'name', 'latitude', 'longitude'],
  });
}
```

> 이 메서드 1개만 spots.service.ts에 추가 (기존 코드 수정 아님, 신규 메서드 추가)

---

## 5. 작업 순서 체크리스트

```
[ ] Step 1: forecast.entity.ts 스키마 변경
    [ ] swell_height, swell_period, swell_direction 컬럼 추가
    [ ] wind_direction: enum → decimal 타입 변경
    [ ] wind_speed, wind_gusts, wind_direction nullable 전환
    [ ] tide_height, tide_status nullable 전환
    [ ] UNIQUE(spotId, forecastTime) 제약 추가

[ ] Step 2: forecast-provider.interface.ts 수정
    [ ] ForecastData에 swell 필드 추가
    [ ] windDirection 타입 string → number
    [ ] wind, tide 필드 optional 전환

[ ] Step 3: open-meteo.provider.ts 구현
    [ ] Weather API URL + 파라미터 추가
    [ ] fetchMarineData() 분리
    [ ] fetchWeatherData() 추가
    [ ] Promise.all 병렬 호출
    [ ] mergeResponses() time 키 머지 구현
    [ ] Weather 실패 시 wind null 처리

[ ] Step 4: forecasts.service.ts 크론 구현
    [ ] spots.service.ts에 findAllActive() 추가
    [ ] fetchAllForecasts() 크론 로직 구현
    [ ] upsertForecasts() DB 저장 구현
    [ ] spot별 try/catch + 로그

[ ] 검증
    [ ] 서버 시작 후 크론 동작 확인 (로그)
    [ ] DB에 forecasts 데이터 저장 확인
    [ ] Swagger에서 GET /spots/:spotId/forecast 조회 확인
    [ ] Swagger에서 GET /spots/:spotId/forecast/current 조회 확인
```

---

## 6. 검증 방법

### 6.1 크론 동작 확인

서버 시작 → 30분 대기 또는 수동 호출:
```
로그 출력 예시:
[ForecastsService] Starting scheduled forecast fetch...
[ForecastsService] Fetching forecast for spot: 양양 서피비치 (uuid...)
[OpenMeteoProvider] Marine API success: 168 hours
[OpenMeteoProvider] Weather API success: 168 hours
[ForecastsService] Upserted 168 forecasts for spot: 양양 서피비치
[ForecastsService] Fetched forecasts for 10/10 spots
```

### 6.2 DB 확인

```sql
-- 데이터 저장 확인
SELECT spot_id, forecast_time, wave_height, swell_height, wind_speed, source
FROM forecasts
ORDER BY forecast_time
LIMIT 10;

-- UNIQUE 제약 확인 (중복 없어야 함)
SELECT spot_id, forecast_time, COUNT(*)
FROM forecasts
GROUP BY spot_id, forecast_time
HAVING COUNT(*) > 1;
```

### 6.3 Swagger API 테스트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /spots/:spotId/forecast?hours=48` | 48시간 시간별 예보 |
| `GET /spots/:spotId/forecast/current` | 현재 시각 예보 + 서핑 적합도 |
| `GET /spots/:spotId/forecast/weekly` | 7일 요약 |

---

## 7. 수정 파일 최종 요약

| 파일 | 작업 | 신규/수정 |
|------|------|----------|
| `forecasts/entities/forecast.entity.ts` | 스키마 변경 | 수정 |
| `forecasts/providers/forecast-provider.interface.ts` | 인터페이스 수정 | 수정 |
| `forecasts/providers/open-meteo.provider.ts` | 2개 API 병렬 호출 + 머지 | 수정 |
| `forecasts/forecasts.service.ts` | 크론 + upsert | 수정 |
| `spots/spots.service.ts` | `findAllActive()` 메서드 추가 | 수정 (1개 메서드 추가) |

**총 5개 파일 수정**, 신규 파일 생성 없음.
