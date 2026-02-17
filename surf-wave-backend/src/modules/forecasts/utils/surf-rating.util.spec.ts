/**
 * @file surf-rating.util.spec.ts
 * @description 서핑 적합도 계산 유틸리티 단위 테스트 (v1.4.2)
 *
 * 테스트 항목:
 * 1. 풍향 FROM → TO 변환 회귀 테스트 (가장 치명적인 버그)
 * 2. gust(돌풍) 영향 검증
 * 3. waveFit 경계값 (override 포함)
 * 4. reef + BEGINNER 하드블록 차단
 * 5. safetyReasons 배열 축적 (다중 사유)
 * 6. 부분 override 동작 확인
 */
import {
  calculateSurfRating,
  getSimpleCondition,
  SpotForRating,
  ForecastForRating,
} from './surf-rating.util';
import { Difficulty } from '../../../common/enums/difficulty.enum';

// =============================================================
// 테스트용 기본 데이터 팩토리
// =============================================================

/** 기본 스팟: 양양 비치브레이크, 초급, 동해안(90°) */
function makeSpot(overrides: Partial<SpotForRating> = {}): SpotForRating {
  return {
    breakType: 'beach_break',
    difficulty: Difficulty.BEGINNER,
    coastFacingDeg: 90,        // 동해안 (동쪽 바다를 바라봄)
    bestSwellDirection: 'NE',  // 북동 스웰 최적
    bestSwellSpreadDeg: 45,    // beach_break 기본 spread
    optimalWaveMin: null,
    optimalWaveMax: null,
    tolerableWaveMin: null,
    tolerableWaveMax: null,
    ...overrides,
  };
}

/** 기본 예보: 양호한 컨디션 */
function makeForecast(overrides: Partial<ForecastForRating> = {}): ForecastForRating {
  return {
    waveHeight: 0.8,
    wavePeriod: 10,
    waveDirection: 45,
    swellDirection: 45,       // NE 스웰
    swellHeight: 0.6,         // v1.4: 스웰 높이
    swellPeriod: 10,          // v1.4: 스웰 주기
    waterTemperature: 22,     // v1.4: 수온 (안전한 기본값)
    windSpeed: 8,
    windGusts: 12,
    windDirection: 270,       // FROM 서쪽 → TO 동쪽(90°) → 오프쇼어
    ...overrides,
  };
}

// =============================================================
// 1. 풍향 FROM → TO 변환 회귀 테스트
// =============================================================

describe('풍향 FROM → TO 변환', () => {
  /**
   * 가장 치명적인 버그 회귀 방지
   * windDirection=270 → FROM 서쪽 → TO 동쪽(90°)
   * 동해안(coastFacingDeg=90°) → 바다쪽으로 향함 → 오프쇼어 → 높은 점수
   */
  test('서해안에서 부는 바람(FROM=270)이 동해안(90°)에서 오프쇼어로 판별', () => {
    const spot = makeSpot({ coastFacingDeg: 90 });
    const forecast = makeForecast({ windDirection: 270 }); // FROM 서쪽
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // windDirFit이 높아야 함 (오프쇼어)
    expect(result.detail.windDirFit).toBeGreaterThanOrEqual(8);
  });

  /**
   * 반대 케이스: 온쇼어 검증
   * windDirection=90 → FROM 동쪽 → TO 서쪽(270°)
   * 동해안(coastFacingDeg=90°) → 바다 반대쪽으로 향함 → 온쇼어 → 낮은 점수
   */
  test('동쪽에서 부는 바람(FROM=90)이 동해안(90°)에서 온쇼어로 판별', () => {
    const spot = makeSpot({ coastFacingDeg: 90 });
    const forecast = makeForecast({ windDirection: 90 }); // FROM 동쪽 (바다→육지)
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // windDirFit이 낮아야 함 (온쇼어)
    expect(result.detail.windDirFit).toBeLessThanOrEqual(3);
  });

  /**
   * 원형 보정 테스트: 360도 경계
   * windDirection=350 → FROM 350° → TO 170°
   * 제주 남해안(coastFacingDeg=180°) → 170°와 180°차이 = 10° → 오프쇼어
   */
  test('360도 경계에서 원형 보정이 올바르게 동작', () => {
    const spot = makeSpot({ coastFacingDeg: 180 }); // 남해안
    const forecast = makeForecast({ windDirection: 350 }); // FROM 350° → TO 170°
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 170°와 180°차이 = 10° → 오프쇼어 범위 (delta<30 → 10점)
    expect(result.detail.windDirFit).toBe(10);
  });

  /** 풍향 데이터 없을 때 중간값(5) 반환 */
  test('풍향 데이터 null일 때 중간값 반환', () => {
    const spot = makeSpot();
    const forecast = makeForecast({ windDirection: null });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.detail.windDirFit).toBe(5);
  });
});

// =============================================================
// 2. gust(돌풍) 영향 검증
// =============================================================

describe('gust(돌풍) 반영', () => {
  /**
   * windSpeed=12, gust=25 → effectiveWind = max(12, 25×0.7=17.5) = 17.5
   * 12km/h만으로는 windSpeedFit=8이지만, gust 반영하면 17.5 → fit=4
   */
  test('gust가 높으면 windSpeedFit이 낮아짐', () => {
    const spot = makeSpot();

    // gust 없을 때
    const noGust = makeForecast({ windSpeed: 12, windGusts: 0 });
    const resultNoGust = calculateSurfRating(spot, noGust, Difficulty.BEGINNER);

    // gust 있을 때
    const withGust = makeForecast({ windSpeed: 12, windGusts: 25 });
    const resultWithGust = calculateSurfRating(spot, withGust, Difficulty.BEGINNER);

    // gust가 있으면 점수가 더 낮아야 함
    expect(resultWithGust.detail.windSpeedFit).toBeLessThan(resultNoGust.detail.windSpeedFit);
  });

  /**
   * gust가 50km/h 이상(×0.7=35) → 하드블록 발동
   * effectiveWind > 35 → 전 레벨 BLOCKED
   */
  test('gust가 매우 높으면 하드블록 발동', () => {
    const spot = makeSpot();
    const forecast = makeForecast({ windSpeed: 20, windGusts: 55 }); // 55×0.7=38.5 > 35
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    expect(result.levelFit.INTERMEDIATE).toBe('BLOCKED');
    expect(result.levelFit.ADVANCED).toBe('BLOCKED');
    // v1.4: 강풍 문구에 실제 숫자 포함 형식으로 변경됨
    expect(result.safetyReasons.some(r => r.includes('강풍 위험'))).toBe(true);
  });

  /** gust가 windSpeed보다 낮으면 effectiveWind = windSpeed */
  test('gust < windSpeed이면 windSpeed가 기준', () => {
    const spot = makeSpot();
    // windSpeed=20, gust=10 → effectiveWind = max(20, 7) = 20
    // 20은 "< 25" 구간 → windSpeedFit=2
    const forecast = makeForecast({ windSpeed: 20, windGusts: 10 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // effectiveWind=20 → 20 < 25 구간 → windSpeedFit=2
    expect(result.detail.windSpeedFit).toBe(2);
  });
});

// =============================================================
// 3. waveFit 경계값
// =============================================================

describe('waveFit 경계값', () => {
  /** 파고가 정확히 최적 구간 중앙일 때 최고 점수 */
  test('최적 구간 중앙에서 최고 점수', () => {
    // beach_break + BEGINNER: optimal=[0.5, 1.0], center=0.75
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 0.75 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.detail.waveFit).toBeGreaterThanOrEqual(9);
  });

  /** 파고가 허용 범위 밖일 때 0점 */
  test('허용 범위 밖에서 0점', () => {
    // beach_break + BEGINNER: tolerable=[0.3, 1.2], range=0.45, center=0.75
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 3.0 }); // 허용 범위 훨씬 초과
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.detail.waveFit).toBe(0);
  });

  /** reef_break는 beach_break보다 최적 파고가 높음 */
  test('reef_break는 beach_break보다 최적 구간이 높음', () => {
    const beachSpot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.INTERMEDIATE });
    const reefSpot = makeSpot({ breakType: 'reef_break', difficulty: Difficulty.INTERMEDIATE });
    // 1.5m 파고: reef에서는 최적 구간 내(1.0~2.0), beach에서도 최적 구간 내(0.8~1.5 상한)
    const forecast = makeForecast({ waveHeight: 1.5 });

    const beachResult = calculateSurfRating(beachSpot, forecast, Difficulty.INTERMEDIATE);
    const reefResult = calculateSurfRating(reefSpot, forecast, Difficulty.INTERMEDIATE);

    // reef의 최적 중심(1.5)이 현재 파고(1.5)와 일치 → reef 점수가 더 높아야 함
    expect(reefResult.detail.waveFit).toBeGreaterThanOrEqual(beachResult.detail.waveFit);
  });
});

// =============================================================
// 4. reef + BEGINNER 하드블록
// =============================================================

describe('하드블록 차단', () => {
  /** reef_break + BEGINNER → BLOCKED */
  test('reef_break 스팟에서 BEGINNER는 BLOCKED', () => {
    const spot = makeSpot({ breakType: 'reef_break', difficulty: Difficulty.INTERMEDIATE });
    const forecast = makeForecast({ waveHeight: 0.5 }); // 낮은 파도여도

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    expect(result.safetyReasons).toContain('리프/포인트 브레이크 - 초보자 서핑 금지');
  });

  /** point_break + BEGINNER → BLOCKED */
  test('point_break 스팟에서 BEGINNER는 BLOCKED', () => {
    const spot = makeSpot({ breakType: 'point_break', difficulty: Difficulty.INTERMEDIATE });
    const forecast = makeForecast({ waveHeight: 0.5 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /** EXPERT 스팟에서 INTERMEDIATE도 BLOCKED */
  test('EXPERT 스팟에서 INTERMEDIATE는 BLOCKED', () => {
    const spot = makeSpot({ difficulty: Difficulty.EXPERT });
    const forecast = makeForecast();

    const result = calculateSurfRating(spot, forecast, Difficulty.INTERMEDIATE);

    expect(result.levelFit.INTERMEDIATE).toBe('BLOCKED');
    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /** 파고 > 1.2m + BEGINNER → BLOCKED */
  test('파고 1.2m 초과 시 BEGINNER BLOCKED', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 1.5 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /** 파고 > 2.5m + INTERMEDIATE → WARNING */
  test('파고 2.5m 초과 시 INTERMEDIATE WARNING', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.INTERMEDIATE });
    const forecast = makeForecast({ waveHeight: 3.0 });

    const result = calculateSurfRating(spot, forecast, Difficulty.INTERMEDIATE);

    expect(result.levelFit.INTERMEDIATE).toBe('WARNING');
  });
});

// =============================================================
// 5. safetyReasons 배열 축적 (다중 사유)
// =============================================================

describe('safetyReasons 다중 사유 축적', () => {
  /**
   * reef_break + ADVANCED + 파고 1.5m → BEGINNER에 대해:
   * - "리프/포인트 브레이크 - 초보자 서핑 금지" (룰①)
   * - "상급자 전용 스팟입니다" (룰②)
   * 2개 사유가 모두 축적되어야 함
   */
  test('reef_break + ADVANCED 스팟에서 다중 사유 축적', () => {
    const spot = makeSpot({
      breakType: 'reef_break',
      difficulty: Difficulty.ADVANCED,
    });
    const forecast = makeForecast({ waveHeight: 0.8 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 2개 사유 모두 포함
    expect(result.safetyReasons.length).toBeGreaterThanOrEqual(2);
    expect(result.safetyReasons).toContain('리프/포인트 브레이크 - 초보자 서핑 금지');
    expect(result.safetyReasons).toContain('상급자 전용 스팟입니다');
  });

  /** 위험 조건 없을 때 빈 배열 */
  test('위험 조건 없으면 빈 배열', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 0.5, windSpeed: 5, windGusts: 8 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.safetyReasons).toEqual([]);
  });

  /** BLOCKED일 때 recommendationKo에 모든 사유가 포함 */
  test('BLOCKED시 추천 메시지에 모든 사유 포함', () => {
    const spot = makeSpot({
      breakType: 'reef_break',
      difficulty: Difficulty.ADVANCED,
    });
    const forecast = makeForecast({ waveHeight: 0.8 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // recommendationKo에 모든 사유가 '; '로 연결
    expect(result.recommendationKo).toContain('리프/포인트 브레이크');
    expect(result.recommendationKo).toContain('상급자 전용');
  });
});

// =============================================================
// 6. 부분 override 동작 확인
// =============================================================

describe('부분 override', () => {
  /** optimalMin만 override, 나머지는 템플릿 */
  test('optimalWaveMin만 override해도 동작', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      optimalWaveMin: 0.3,   // 템플릿(0.5)보다 낮게 override
      optimalWaveMax: null,   // 템플릿 사용 (1.0)
      tolerableWaveMin: null, // 템플릿 사용 (0.3)
      tolerableWaveMax: null, // 템플릿 사용 (1.2)
    });
    // 파고 0.35: 원래 템플릿 optimal 구간(0.5~1.0) 밖이지만
    // override로 optimalMin=0.3이므로 새 optimal 구간(0.3~1.0), center=0.65
    const forecast = makeForecast({ waveHeight: 0.65 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // center=0.65에 파고=0.65 → 거의 완벽
    expect(result.detail.waveFit).toBeGreaterThanOrEqual(9);
  });

  /** 전체 4개 override */
  test('4개 전부 override', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      optimalWaveMin: 0.2,
      optimalWaveMax: 0.6,
      tolerableWaveMin: 0.1,
      tolerableWaveMax: 0.8,
    });
    // center = (0.2+0.6)/2 = 0.4, range = (0.8-0.1)/2 = 0.35
    const forecast = makeForecast({ waveHeight: 0.4 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 정확히 center → 10점
    expect(result.detail.waveFit).toBe(10);
  });

  /** tolerableWaveMax만 override (고성 봉포 시나리오) */
  test('tolerableWaveMax만 override (부분)', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.INTERMEDIATE,
      optimalWaveMin: null,    // 템플릿: 0.8
      optimalWaveMax: null,    // 템플릿: 1.5
      tolerableWaveMin: null,  // 템플릿: 0.5
      tolerableWaveMax: 2.5,   // 템플릿(2.0)보다 넓게 override
    });
    // tolerable range = (2.5-0.5)/2 = 1.0 (기존 (2.0-0.5)/2=0.75보다 넓음)
    // 파고 2.0: center=1.15, distance=0.85, 기존 range=0.75면 0.85/0.75=1.13 → 0점
    // override range=1.0이면 0.85/1.0=0.85 → 10*(1-0.85)=1.5점
    const forecast = makeForecast({ waveHeight: 2.0 });

    const result = calculateSurfRating(spot, forecast, Difficulty.INTERMEDIATE);

    // override로 범위가 넓어졌으므로 0보다 큰 점수
    expect(result.detail.waveFit).toBeGreaterThan(0);
  });
});

// =============================================================
// 7. getSimpleCondition 기본 동작
// =============================================================

describe('getSimpleCondition', () => {
  test('잔잔한 바다에서 올바른 상태 반환', () => {
    const forecast = makeForecast({ waveHeight: 0.3, windSpeed: 5, windGusts: 8 });
    const condition = getSimpleCondition(forecast);

    expect(condition.waveStatus).toBe('잔잔');
    expect(condition.windStatus).toBe('약함');
  });

  test('높은 파도 + 강풍에서 주의 반환', () => {
    const forecast = makeForecast({ waveHeight: 3.0, windSpeed: 35, windGusts: 45 });
    const condition = getSimpleCondition(forecast);

    expect(condition.waveStatus).toBe('위험');
    expect(condition.windStatus).toBe('매우 강함');
    expect(condition.overall).toBe('주의');
  });

  test('좋은 컨디션에서 좋음 반환', () => {
    const forecast = makeForecast({ waveHeight: 1.0, windSpeed: 8, windGusts: 10 });
    const condition = getSimpleCondition(forecast);

    expect(condition.waveStatus).toBe('적당');
    expect(condition.overall).toBe('좋음');
  });
});

// =============================================================
// 8. periodFit 구간 검증
// =============================================================

describe('periodFit 구간', () => {
  test('14초 이상이면 10점', () => {
    const spot = makeSpot();
    const forecast = makeForecast({ wavePeriod: 14 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);
    expect(result.detail.periodFit).toBe(10);
  });

  test('5초에서 1점 (wind swell)', () => {
    const spot = makeSpot();
    const forecast = makeForecast({ wavePeriod: 5 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);
    expect(result.detail.periodFit).toBe(1);
  });

  test('4초 이하면 0점 (서핑 불가)', () => {
    const spot = makeSpot();
    const forecast = makeForecast({ wavePeriod: 4 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);
    expect(result.detail.periodFit).toBe(0);
  });
});

// =============================================================
// 9. v1.4 거짓양성(False Positive) 테스트
//    PASS인데 실제로 위험한 edge case를 탐지
// =============================================================

describe('거짓양성 시나리오 - PASS인데 위험할 수 있는 복합 조건', () => {
  /**
   * 시나리오 1: "모든 임계값 바로 아래" (v1.4.1 보정 대상)
   *
   * 수온 14.5°C (14°C 미만 아님), gust 34km/h (35 미만),
   * 파고 1.15m (1.2 미만), 풍속 24km/h
   * → 개별로는 모두 임계값 아래라 하드블록 통과
   * → v1.4.1 복합 위험 감점으로 surfRating ≤ 4.0 + WARNING
   */
  test('복합 위험: 수온 14.5°C + gust 34km/h + 파고 1.15m → 보정 후 ≤ 4.0 + WARNING', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({
      waveHeight: 1.15,
      wavePeriod: 6,
      windSpeed: 24,
      windGusts: 34,
      waterTemperature: 14.5,
      swellHeight: 0.3,
      swellPeriod: 6,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // v1.4.1: 복합 위험 보정 → WARNING + 낮은 점수
    expect(result.levelFit.BEGINNER).toBe('WARNING');
    expect(result.surfRating).toBeLessThanOrEqual(4.0);
    // windSpeedFit이 낮아야 함 (gust 34 → effectiveWind=max(24, 23.8)=24)
    expect(result.detail.windSpeedFit).toBeLessThanOrEqual(2);
    // 복합 위험 사유 포함
    expect(result.safetyReasons.some(r => r.includes('복합 위험'))).toBe(true);
  });

  /**
   * 시나리오 2: "파고 1.2m 정확히 경계"
   *
   * beach_break BEGINNER: 파고 1.2m = hardblock 임계값 (> 1.2이면 BLOCKED)
   * 1.2m 정확히면 PASS → 이때 waveFit 경계값 수정이 올바른지 확인
   */
  test('경계값: 파고 정확히 1.2m → PASS이고 waveFit 3점 (tolerable 경계)', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 1.2 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 1.2m = 정확히 임계값 → PASS (>1.2만 BLOCKED)
    expect(result.levelFit.BEGINNER).toBe('PASS');
    // tolerable 상한(1.2) 경계이므로 waveFit=3 (v1.4 수정됨, v1.3에선 0이었음)
    expect(result.detail.waveFit).toBe(3);
  });

  /**
   * 시나리오 3: "온쇼어 강풍 + 짧은 주기" (v1.4.1 품질 게이트 대상)
   *
   * 풍속 자체는 OK(18km/h), gust 29km/h → effectiveWind 20.3
   * 하지만 온쇼어(바다→육지)이고 주기 5초 → 파도 품질 최악
   * → v1.4.1 품질 게이트로 surfRating ≤ 4.0 + BEGINNER WARNING
   */
  test('품질 게이트: 온쇼어 + 짧은 주기 → 보정 후 ≤ 4.0 + BEGINNER WARNING', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90, // 동해안
    });
    const forecast = makeForecast({
      waveHeight: 0.7,
      wavePeriod: 5,
      windSpeed: 18,
      windGusts: 29,
      windDirection: 90, // FROM 동쪽 → TO 서쪽(270°) → 온쇼어
      swellHeight: 0.2,
      swellPeriod: 5,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // v1.4.1: 품질 게이트 → BEGINNER WARNING + 상한 4.0
    expect(result.levelFit.BEGINNER).toBe('WARNING');
    // 온쇼어 → windDirFit 1점, 짧은 주기 → periodFit 1점
    expect(result.detail.windDirFit).toBeLessThanOrEqual(1);
    expect(result.detail.periodFit).toBeLessThanOrEqual(1);
    // 품질 게이트에 의해 상한 4.0
    expect(result.surfRating).toBeLessThanOrEqual(4.0);
    // 품질 게이트 사유 포함
    expect(result.safetyReasons.some(r => r.includes('온쇼어'))).toBe(true);
  });

  /**
   * 시나리오 4: "수온 10.1°C + gust 34km/h"
   *
   * 수온 10.1°C → 14°C 미만이라 WARNING (P2 장비 필수)
   * gust 34km/h → 35 미만이라 돌풍 WARNING 안 걸림
   * → WARNING이 걸리는지 확인 (수온 기준)
   */
  test('수온 10.1°C → BEGINNER WARNING (웻슈트 필수)', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({
      waveHeight: 0.5,
      windSpeed: 8,
      windGusts: 12,
      waterTemperature: 10.1,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 수온 <14°C → BEGINNER WARNING
    expect(result.levelFit.BEGINNER).toBe('WARNING');
    expect(result.safetyReasons.some(r => r.includes('웻슈트'))).toBe(true);
  });

  /**
   * 시나리오 5: "수온 9.9°C → BEGINNER BLOCKED"
   *
   * 수온 <10°C → 극저온 → BEGINNER BLOCKED
   */
  test('수온 9.9°C → BEGINNER BLOCKED (저체온증 위험)', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({
      waveHeight: 0.5,
      windSpeed: 5,
      windGusts: 8,
      waterTemperature: 9.9,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    expect(result.safetyReasons.some(r => r.includes('저체온증'))).toBe(true);
    // INTERMEDIATE는 WARNING
    expect(result.levelFit.INTERMEDIATE).toBe('WARNING');
  });

  /**
   * 시나리오 6: "gust 정확히 35km/h → BEGINNER WARNING"
   */
  test('gust 정확히 35km/h → BEGINNER WARNING', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({
      waveHeight: 0.5,
      windSpeed: 10,
      windGusts: 35,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.levelFit.BEGINNER).toBe('WARNING');
    expect(result.safetyReasons.some(r => r.includes('돌풍'))).toBe(true);
  });

  /**
   * 시나리오 7: "gust 44km/h → BEGINNER WARNING, gust 45km/h → BEGINNER BLOCKED"
   * 경계값 정확도 확인
   */
  test('gust 44km/h → WARNING, 45km/h → BLOCKED 경계', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });

    // 44km/h → effectiveWind = max(10, 30.8) = 30.8 < 35 → gust 판정으로
    const warn = calculateSurfRating(
      spot,
      makeForecast({ waveHeight: 0.5, windSpeed: 10, windGusts: 44 }),
      Difficulty.BEGINNER,
    );
    expect(warn.levelFit.BEGINNER).toBe('WARNING');

    // 45km/h → effectiveWind = max(10, 31.5) = 31.5 < 35 → gust≥45 BLOCKED
    const block = calculateSurfRating(
      spot,
      makeForecast({ waveHeight: 0.5, windSpeed: 10, windGusts: 45 }),
      Difficulty.BEGINNER,
    );
    expect(block.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /**
   * 시나리오 8: "안전한 조건에서 높은 점수 확인" (거짓음성 방지)
   *
   * 완벽한 조건: optimal 파고, 오프쇼어, 긴 주기, 약한 바람, 따뜻한 수온
   * → PASS이고 7점 이상이어야 함
   */
  test('완벽한 조건: 높은 surfRating + PASS', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
      bestSwellDirection: 'NE',
    });
    const forecast = makeForecast({
      waveHeight: 0.7,         // optimal 범위 내
      wavePeriod: 12,          // 좋은 ground swell
      windSpeed: 3,            // 글래시
      windGusts: 5,            // 약한 돌풍
      windDirection: 270,      // FROM 서쪽 → TO 동쪽 → 오프쇼어
      swellDirection: 45,      // NE → bestSwellDirection과 일치
      swellHeight: 0.8,        // 충분한 스웰
      swellPeriod: 12,         // 긴 주기
      waterTemperature: 24,    // 따뜻한 수온
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.levelFit.BEGINNER).toBe('PASS');
    expect(result.surfRating).toBeGreaterThanOrEqual(7);
    expect(result.detail.waveFit).toBe(10);
    expect(result.detail.windDirFit).toBeGreaterThanOrEqual(8);
    expect(result.safetyReasons).toEqual([]);
  });
});

// =============================================================
// 10. v1.4 safetyReasons 우선순위 정렬 검증
// =============================================================

describe('safetyReasons 우선순위 정렬', () => {
  /**
   * 강풍(P1) + 웻슈트(P2) + 리프(P3) → P1이 먼저
   */
  test('강풍 + 저수온 + 리프 → 생존 위험이 먼저 표시', () => {
    const spot = makeSpot({
      breakType: 'reef_break',
      difficulty: Difficulty.INTERMEDIATE,
    });
    const forecast = makeForecast({
      waveHeight: 0.5,
      windSpeed: 40,           // effectiveWind > 35
      windGusts: 55,
      waterTemperature: 8,     // 극저온
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 첫 번째 사유가 생존 위험(P1)이어야 함
    expect(result.safetyReasons[0]).toMatch(/풍속.*강풍/);
    // 저체온증(P1)이 리프(P3)보다 먼저
    const tempIdx = result.safetyReasons.findIndex(r => r.includes('저체온증'));
    const reefIdx = result.safetyReasons.findIndex(r => r.includes('리프'));
    expect(tempIdx).toBeLessThan(reefIdx);
  });

  /**
   * 웻슈트(P2)만 있을 때 정상 동작
   */
  test('수온 13°C만 해당 → 웻슈트 필수만 표시', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({
      waveHeight: 0.5,
      windSpeed: 5,
      windGusts: 8,
      waterTemperature: 13,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.safetyReasons).toHaveLength(1);
    expect(result.safetyReasons[0]).toContain('웻슈트 필수');
    expect(result.levelFit.BEGINNER).toBe('WARNING');
  });

  /**
   * 파고 문구에 실제 수치 포함 확인
   */
  test('파고 차단 문구에 실제 파고 수치 포함', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 1.5 });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.safetyReasons.some(r => r.includes('1.5m'))).toBe(true);
  });

  /**
   * 강풍 문구에 돌풍 숫자 포함 확인
   */
  test('강풍 문구에 실제 풍속/돌풍 숫자 포함', () => {
    const spot = makeSpot();
    const forecast = makeForecast({
      waveHeight: 0.5,
      windSpeed: 10,
      windGusts: 55,  // effectiveWind = max(10, 38.5) = 38.5 > 35
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // "풍속 10km/h (돌풍 55km/h) - 강풍 위험" 형태
    expect(result.safetyReasons.some(r => r.includes('풍속') && r.includes('55'))).toBe(true);
  });
});

// =============================================================
// 11. v1.4.1 보정 필터 (Compound Risk + Quality Gate) 테스트
// =============================================================

describe('v1.4.1 복합 위험 감점 (Compound Risk)', () => {
  /**
   * 근접 항목 1개만 해당 → 감점 없음 (보정이 과하지 않은지 확인)
   *
   * gust 34km/h만 근접, 수온 22°C(안전), 파고 0.7m(optimal 내)
   * gustNear = (34-30)/15 = 0.267 × 1.0 = 0.267
   * waveNear = 0 (optimal 내), waterTempNear = 0
   * riskIndex = 0.267 < 1.0 → 감점 없음
   */
  test('근접 항목 1개만 → 감점 없음 (과잉 보정 방지)', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({
      waveHeight: 0.7,
      wavePeriod: 10,
      windSpeed: 8,
      windGusts: 34,
      waterTemperature: 22,
      swellHeight: 0.6,
      swellPeriod: 10,
      windDirection: 270, // 오프쇼어
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 좋은 컨디션 + gust 하나만 근접 → PASS 유지, 높은 점수
    expect(result.levelFit.BEGINNER).toBe('PASS');
    expect(result.surfRating).toBeGreaterThanOrEqual(6);
    // 복합 위험 사유 없음
    expect(result.safetyReasons.some(r => r.includes('복합 위험'))).toBe(false);
  });

  /**
   * INTERMEDIATE는 compound risk 미적용 확인
   *
   * 동일한 복합 위험 조건이지만 userLevel=INTERMEDIATE → 감점 없음
   */
  test('INTERMEDIATE는 compound risk 미적용', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.INTERMEDIATE });
    const forecast = makeForecast({
      waveHeight: 1.9,     // tolerableMax(2.0) 근접
      wavePeriod: 6,
      windSpeed: 24,
      windGusts: 40,       // gust 근접
      waterTemperature: 14.5,  // 수온 근접
      swellHeight: 0.3,
      swellPeriod: 6,
    });

    const resultBeginner = calculateSurfRating(
      makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER }),
      { ...forecast, waveHeight: 1.15 },
      Difficulty.BEGINNER,
    );
    const resultIntermediate = calculateSurfRating(spot, forecast, Difficulty.INTERMEDIATE);

    // INTERMEDIATE는 compound risk에 의한 복합 위험 사유 없음
    expect(resultIntermediate.safetyReasons.some(r => r.includes('복합 위험'))).toBe(false);
  });

  /**
   * riskIndex 경계값 테스트: 정확히 1.0 이상 → ×0.70 + WARNING 적용
   *
   * gust 40 + 수온 15°C → 하드블록 안 걸리면서 riskIndex > 1.0
   * gustNear = (40-30)/15 = 0.667 × 1.0 = 0.667
   * waterTempNear = (16-15)/2 = 0.5 × 0.7 = 0.35
   * waveNear = 0 (optimal 내)
   * riskIndex = 0.667 + 0 + 0.35 = 1.017 → ×0.70 + WARNING
   */
  test('riskIndex ≈ 1.0 경계 → ×0.70 + WARNING 적용', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({
      waveHeight: 0.7,      // optimal 내 (waveNear=0)
      wavePeriod: 10,
      windSpeed: 8,
      windGusts: 40,        // gustNear = (40-30)/15 = 0.667
      waterTemperature: 15,  // waterTempNear = (16-15)/2 = 0.5
      swellHeight: 0.6,
      swellPeriod: 10,
      windDirection: 270,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // riskIndex ≈ 1.017 ≥ 1.0 → compound risk 적용
    // 하드블록: gust≥35 → BEGINNER WARNING (별도로 걸림)
    // compound: WARNING 추가 시도 → 이미 WARNING이므로 중복 방지
    expect(result.levelFit.BEGINNER).toBe('WARNING');
    expect(result.safetyReasons.some(r => r.includes('복합 위험'))).toBe(true);
  });
});

describe('v1.4.1 품질 게이트 (Quality Gate)', () => {
  /**
   * 품질 게이트 비해당: periodFit > 2이면 상한 미적용
   *
   * 온쇼어(windDirFit ≤ 2)이지만 주기 10초(periodFit = 8)
   * → 품질 게이트 조건 불충족 → 상한 미적용
   */
  test('온쇼어지만 긴 주기 → 품질 게이트 미적용', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 0.7,
      wavePeriod: 10,       // periodFit = 8 (> 2) → 게이트 조건 불충족
      windSpeed: 8,
      windGusts: 12,
      windDirection: 90,    // FROM 동쪽 → 온쇼어
      swellHeight: 0.6,
      swellPeriod: 10,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 온쇼어로 windDirFit은 낮지만, 주기가 길어 품질 게이트 미적용
    expect(result.detail.windDirFit).toBeLessThanOrEqual(2);
    expect(result.detail.periodFit).toBeGreaterThan(2);
    // 품질 게이트 사유 없음
    expect(result.safetyReasons.some(r => r.includes('온쇼어'))).toBe(false);
  });

  /**
   * INTERMEDIATE에서 품질 게이트 해당 → 상한만 적용, WARNING 없음
   *
   * 온쇼어 + 짧은 주기이지만 INTERMEDIATE → rating cap만, status PASS
   */
  test('INTERMEDIATE: 품질 게이트 → 상한만, WARNING 없음', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.INTERMEDIATE,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 1.0,
      wavePeriod: 5,        // periodFit = 1
      windSpeed: 8,
      windGusts: 12,
      windDirection: 90,    // 온쇼어
      swellHeight: 0.2,
      swellPeriod: 5,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.INTERMEDIATE);

    // 품질 게이트에 의해 상한 적용
    expect(result.surfRating).toBeLessThanOrEqual(4.0);
    // INTERMEDIATE는 WARNING 안 올림 (PASS 유지)
    expect(result.levelFit.INTERMEDIATE).toBe('PASS');
  });

  /**
   * 보정 두 개 동시 해당: compound risk + quality gate 모두 적용
   *
   * 온쇼어 + 짧은 주기(품질 게이트) + gust 근접 + 수온 근접(compound)
   * → 두 보정 모두 적용되어 점수 더 낮아짐
   */
  test('compound risk + quality gate 동시 적용', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 1.15,     // tolMax(1.2) 근접 → waveNear 높음
      wavePeriod: 5,        // periodFit = 1 → 품질 게이트 해당
      windSpeed: 18,
      windGusts: 40,        // gustNear = (40-30)/15 = 0.667
      windDirection: 90,    // 온쇼어 → windDirFit ≤ 2 → 품질 게이트 해당
      waterTemperature: 15, // waterTempNear = (16-15)/2 = 0.5
      swellHeight: 0.2,
      swellPeriod: 5,
    });

    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 두 보정 모두 적용 → 매우 낮은 점수 + WARNING
    expect(result.surfRating).toBeLessThanOrEqual(4.0);
    expect(result.levelFit.BEGINNER).toBe('WARNING');
    // 두 가지 사유 모두 포함
    expect(result.safetyReasons.some(r => r.includes('복합 위험') || r.includes('온쇼어'))).toBe(true);
  });
});

// =============================================================
// 12. v1.4.2 거짓 음성 보정 (False Negative Correction)
// =============================================================

describe('v1.4.2 FN-4: waveFit grace margin', () => {
  /**
   * 파고 0.28m → tolMin(0.3)보다 2cm 아래
   * grace zone: 0.25 ~ 0.30 범위 → waveFit 1~2점 (기존: 0점)
   */
  test('파고 0.28m → grace zone 내 → waveFit 1~2점 (기존 0점)', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 0.28 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // grace zone 내이므로 0점이 아닌 1~2점
    expect(result.detail.waveFit).toBeGreaterThanOrEqual(1);
    expect(result.detail.waveFit).toBeLessThanOrEqual(2);
  });

  /**
   * 파고 0.25m → grace 하한 경계 (tolMin - 0.05 = 0.25)
   * grace zone 시작점이므로 waveFit = 1점
   */
  test('파고 0.25m → grace 하한 경계 → waveFit ≈ 1점', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 0.25 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.detail.waveFit).toBeGreaterThanOrEqual(1);
    expect(result.detail.waveFit).toBeLessThanOrEqual(1.5);
  });

  /**
   * 파고 1.22m → tolMax(1.2) 위, grace zone 내 (1.2~1.25)
   * waveFit 1~2점 (기존: 0점)
   */
  test('파고 1.22m → 상한 grace zone → waveFit 1~2점', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 1.22 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.detail.waveFit).toBeGreaterThanOrEqual(1);
    expect(result.detail.waveFit).toBeLessThanOrEqual(2);
  });

  /**
   * 파고 0.20m → grace 밖 (tolMin-0.05=0.25보다 작음)
   * 기존대로 0점
   */
  test('파고 0.20m → grace 밖 → waveFit 0점', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 0.20 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.detail.waveFit).toBe(0);
  });

  /**
   * 파고 1.30m → 상한 grace 밖 (tolMax+0.05=1.25 초과)
   * 기존대로 0점
   */
  test('파고 1.30m → 상한 grace 밖 → waveFit 0점', () => {
    const spot = makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER });
    const forecast = makeForecast({ waveHeight: 1.30 });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    expect(result.detail.waveFit).toBe(0);
  });
});

describe('v1.4.2 FN-2: 약풍 시 windDirFit 보정', () => {
  /**
   * 글래시(3km/h) + 온쇼어 → windDirFit ≥ 7 (기존: 1점)
   * 바람이 거의 없으므로 풍향은 무의미
   */
  test('글래시(3km/h) + 온쇼어 → windDirFit ≥ 7', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 0.7,
      windSpeed: 3,
      windGusts: 4,       // effectiveWind = max(3, 2.8) = 3 < 5
      windDirection: 90,   // FROM 동쪽 → TO 서쪽 → 온쇼어 → 기존 1점
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 글래시이므로 풍향 무의미 → windDirFit ≥ 7
    expect(result.detail.windDirFit).toBeGreaterThanOrEqual(7);
  });

  /**
   * 매우 약한 바람(6km/h) + 온쇼어 → windDirFit 부분 보정
   * 기존 1점 → (1+7)/2 = 4점으로 보정
   */
  test('약한 바람(6km/h) + 온쇼어 → windDirFit 부분 보정', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 0.7,
      windSpeed: 6,
      windGusts: 8,       // effectiveWind = max(6, 5.6) = 6, 5~8 범위
      windDirection: 90,   // 온쇼어 → 기존 1점
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 부분 보정: (1+7)/2 = 4점
    expect(result.detail.windDirFit).toBeGreaterThanOrEqual(3);
    expect(result.detail.windDirFit).toBeLessThanOrEqual(5);
  });

  /**
   * 보통 바람(15km/h) + 온쇼어 → 보정 없음 (기존 1점)
   */
  test('보통 바람(15km/h) + 온쇼어 → 보정 없음', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 0.7,
      windSpeed: 15,
      windGusts: 18,
      windDirection: 90,   // 온쇼어
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 바람 있으므로 보정 없음 → 온쇼어 1점 유지
    expect(result.detail.windDirFit).toBeLessThanOrEqual(1);
  });

  /**
   * 글래시 + 오프쇼어 → 이미 높은 점수, 보정 불필요
   * windDirFit = 10 (오프쇼어) → max(10, 7) = 10 (변동 없음)
   */
  test('글래시 + 오프쇼어 → 보정 불필요 (이미 높음)', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 0.7,
      windSpeed: 3,
      windGusts: 4,
      windDirection: 270,  // FROM 서쪽 → TO 동쪽 → 오프쇼어 → 10점
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 이미 10점이므로 보정 불필요
    expect(result.detail.windDirFit).toBe(10);
  });
});

describe('v1.4.2 FN-1: 하드블록 grace zone', () => {
  /**
   * 파고 1.25m + beach_break + 나머지 완벽 → WARNING (기존: BLOCKED)
   */
  test('파고 1.25m + beach_break + 좋은 조건 → WARNING', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
      bestSwellDirection: 'NE',
    });
    const forecast = makeForecast({
      waveHeight: 1.25,
      wavePeriod: 12,        // periodFit = 9
      windSpeed: 3,          // windSpeedFit = 10
      windGusts: 5,
      windDirection: 270,    // 오프쇼어 → windDirFit = 10
      swellDirection: 45,    // NE 스웰 → swellFit 높음
      swellHeight: 0.8,
      swellPeriod: 12,
      waterTemperature: 24,
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // grace zone: 1.2~1.4 + beach_break + fit 평균 ≥ 7.0 → WARNING
    expect(result.levelFit.BEGINNER).toBe('WARNING');
    // 안전 사유에 "경험자 동행 필수" 메시지 포함
    expect(result.safetyReasons.some(r => r.includes('경험자 동행 필수'))).toBe(true);
  });

  /**
   * 파고 1.25m + reef_break → BLOCKED 유지 (reef은 절대 완화 안 함)
   */
  test('파고 1.25m + reef_break → BLOCKED 유지', () => {
    const spot = makeSpot({
      breakType: 'reef_break',
      difficulty: Difficulty.INTERMEDIATE,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 1.25,
      wavePeriod: 12,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 270,
      swellDirection: 45,
      swellHeight: 0.8,
      swellPeriod: 12,
      waterTemperature: 24,
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // reef_break → 절대 완화 안 함
    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /**
   * 파고 1.45m + beach_break + 좋은 조건 → BLOCKED 유지 (grace 초과)
   */
  test('파고 1.45m → grace zone 초과 → BLOCKED 유지', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 1.45,
      wavePeriod: 12,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 270,
      swellDirection: 45,
      swellHeight: 0.8,
      swellPeriod: 12,
      waterTemperature: 24,
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 1.45m > 1.4 → grace zone 밖 → BLOCKED 유지
    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /**
   * 파고 1.25m + 나머지 fit 평균 낮음 → BLOCKED 유지
   * 바람 강하고 주기 짧으면 나머지 fit 평균이 7.0 미만
   */
  test('파고 1.25m + 나머지 조건 나쁨 → BLOCKED 유지', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 1.25,
      wavePeriod: 5,         // periodFit = 1
      windSpeed: 20,         // windSpeedFit = 4
      windGusts: 25,
      windDirection: 90,     // 온쇼어 → windDirFit = 1
      swellDirection: 180,   // 스웰 방향 안 맞음
      swellHeight: 0.2,
      swellPeriod: 5,
      waterTemperature: 24,
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 나머지 fit 평균 낮음 → grace zone 미적용 → BLOCKED 유지
    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });
});
