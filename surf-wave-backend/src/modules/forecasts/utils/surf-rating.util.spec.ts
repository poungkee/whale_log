/**
 * @file surf-rating.util.spec.ts
 * @description 서핑 적합도 계산 유틸리티 단위 테스트 (v1.3)
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
    expect(result.safetyReasons).toContain('강풍으로 서핑이 위험합니다');
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
