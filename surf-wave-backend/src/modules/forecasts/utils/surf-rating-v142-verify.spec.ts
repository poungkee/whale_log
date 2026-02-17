/**
 * @file surf-rating-v142-verify.spec.ts
 * @description v1.4.2 거짓 음성 보정 검증 스크립트
 *
 * 검증 항목:
 *   A. 기존 거짓양성 보정(v1.4.1)이 깨지지 않았는지 (회귀 검증)
 *   B. 거짓음성 3건(FN-1, FN-2, FN-4)이 실제로 해결되는지
 *   C. 보정이 과하지 않은지 (안전 침해 없는지)
 *
 * 방법: 실제 한국/발리 스팟 시나리오로 before(기대 v1.4.1 동작) vs after(v1.4.2) 비교
 */
import {
  calculateSurfRating,
  SpotForRating,
  ForecastForRating,
  SurfRatingResult,
} from './surf-rating.util';
import { Difficulty } from '../../../common/enums/difficulty.enum';

// =============================================================
// 실제 스팟 데이터 (한국/발리)
// =============================================================

/** 양양 죽도 - 한국 대표 비치브레이크, 초급 */
const YANGYANG_JUKDO: SpotForRating = {
  breakType: 'beach_break',
  difficulty: Difficulty.BEGINNER,
  coastFacingDeg: 90,        // 동해안
  bestSwellDirection: 'NE',
  bestSwellSpreadDeg: 45,
  optimalWaveMin: null,
  optimalWaveMax: null,
  tolerableWaveMin: null,
  tolerableWaveMax: null,
};

/** 제주 중문 - 한국 대표 리프브레이크, 중급 */
const JEJU_JUNGMUN: SpotForRating = {
  breakType: 'reef_break',
  difficulty: Difficulty.INTERMEDIATE,
  coastFacingDeg: 180,       // 남해안
  bestSwellDirection: 'S',
  bestSwellSpreadDeg: 30,
  optimalWaveMin: null,
  optimalWaveMax: null,
  tolerableWaveMin: null,
  tolerableWaveMax: null,
};

/** 발리 쿠타 - 비치브레이크, 초급 */
const BALI_KUTA: SpotForRating = {
  breakType: 'beach_break',
  difficulty: Difficulty.BEGINNER,
  coastFacingDeg: 225,       // 남서쪽 바다
  bestSwellDirection: 'SW',
  bestSwellSpreadDeg: 45,
  optimalWaveMin: null,
  optimalWaveMax: null,
  tolerableWaveMin: null,
  tolerableWaveMax: null,
};

/** 발리 울루와뚜 - 리프브레이크, 상급 */
const BALI_ULUWATU: SpotForRating = {
  breakType: 'reef_break',
  difficulty: Difficulty.ADVANCED,
  coastFacingDeg: 225,
  bestSwellDirection: 'SW',
  bestSwellSpreadDeg: 25,
  optimalWaveMin: null,
  optimalWaveMax: null,
  tolerableWaveMin: null,
  tolerableWaveMax: null,
};

/** 부산 송정 - 비치브레이크, 초급 */
const BUSAN_SONGJEONG: SpotForRating = {
  breakType: 'beach_break',
  difficulty: Difficulty.BEGINNER,
  coastFacingDeg: 135,       // 남동쪽
  bestSwellDirection: 'SE',
  bestSwellSpreadDeg: 45,
  optimalWaveMin: null,
  optimalWaveMax: null,
  tolerableWaveMin: null,
  tolerableWaveMax: null,
};

// =============================================================
// 헬퍼: 결과 포매팅
// =============================================================

function fmt(r: SurfRatingResult, label: string): string {
  return [
    `[${label}]`,
    `  점수: ${r.surfRating}`,
    `  BEG: ${r.levelFit.BEGINNER} | INT: ${r.levelFit.INTERMEDIATE} | ADV: ${r.levelFit.ADVANCED}`,
    `  waveFit=${r.detail.waveFit} periodFit=${r.detail.periodFit} windSpeedFit=${r.detail.windSpeedFit} swellFit=${r.detail.swellFit} windDirFit=${r.detail.windDirFit}`,
    `  추천: ${r.recommendationKo}`,
    `  안전: ${r.safetyReasons.length > 0 ? r.safetyReasons.join('; ') : '(없음)'}`,
  ].join('\n');
}

// =============================================================
// A. 기존 거짓양성 보정(v1.4.1) 회귀 검증
//    v1.4.2 변경이 기존 안전 보정을 깨뜨리지 않는지 확인
// =============================================================

describe('A. v1.4.1 거짓양성 보정 회귀 검증', () => {
  /**
   * A-1: 복합 위험 (임계값 바로 아래) → 여전히 WARNING + 낮은 점수
   */
  test('A-1: 복합 위험 시나리오 → 여전히 WARNING + ≤ 4.0', () => {
    const forecast: ForecastForRating = {
      waveHeight: 1.15,
      wavePeriod: 6,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 0.3,
      swellPeriod: 6,
      waterTemperature: 14.5,
      windSpeed: 24,
      windGusts: 34,
      windDirection: 270,
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'A-1: 복합 위험 (양양 죽도)'));

    expect(result.levelFit.BEGINNER).toBe('WARNING');
    expect(result.surfRating).toBeLessThanOrEqual(4.0);
    expect(result.safetyReasons.some(r => r.includes('복합 위험'))).toBe(true);
  });

  /**
   * A-2: 온쇼어 + 짧은 주기 → 품질 게이트 여전히 작동
   */
  test('A-2: 온쇼어 + 짧은 주기 → 품질 게이트 ≤ 4.0', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.7,
      wavePeriod: 5,
      waveDirection: 90,
      swellDirection: 90,
      swellHeight: 0.2,
      swellPeriod: 5,
      waterTemperature: 22,
      windSpeed: 18,
      windGusts: 29,
      windDirection: 90,     // 온쇼어 (동해안에서 FROM 동쪽)
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'A-2: 온쇼어+짧은주기 (양양 죽도)'));

    expect(result.surfRating).toBeLessThanOrEqual(4.0);
    expect(result.detail.windDirFit).toBeLessThanOrEqual(2);
    expect(result.detail.periodFit).toBeLessThanOrEqual(1);
  });

  /**
   * A-3: reef + BEGINNER → 여전히 BLOCKED
   */
  test('A-3: reef + BEGINNER → BLOCKED 유지', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.8,
      wavePeriod: 10,
      waveDirection: 180,
      swellDirection: 180,
      swellHeight: 0.6,
      swellPeriod: 10,
      waterTemperature: 24,
      windSpeed: 5,
      windGusts: 8,
      windDirection: 0,
    };
    const result = calculateSurfRating(JEJU_JUNGMUN, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'A-3: reef + BEGINNER (제주 중문)'));

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /**
   * A-4: 강풍 → 전 레벨 BLOCKED (변함없이)
   */
  test('A-4: 강풍 → 전 레벨 BLOCKED', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.8,
      wavePeriod: 10,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 0.6,
      swellPeriod: 10,
      waterTemperature: 22,
      windSpeed: 40,
      windGusts: 55,
      windDirection: 90,
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'A-4: 강풍 (양양 죽도)'));

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    expect(result.levelFit.INTERMEDIATE).toBe('BLOCKED');
    expect(result.levelFit.ADVANCED).toBe('BLOCKED');
  });

  /**
   * A-5: 극저온 → BEGINNER BLOCKED
   */
  test('A-5: 수온 8°C → BEGINNER BLOCKED', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.7,
      wavePeriod: 10,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 0.6,
      swellPeriod: 10,
      waterTemperature: 8,
      windSpeed: 5,
      windGusts: 8,
      windDirection: 270,
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'A-5: 극저온 (양양 죽도)'));

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    expect(result.safetyReasons.some(r => r.includes('저체온증'))).toBe(true);
  });
});

// =============================================================
// B. 거짓음성 3건 해결 검증 (핵심)
//    실제 스팟에서 before(예상 v1.4.1) vs after(v1.4.2) 비교
// =============================================================

describe('B. 거짓음성 해결 검증 (실제 시나리오)', () => {
  /**
   * B-1: FN-4 - 양양 죽도, 파고 0.28m (tolMin=0.3 바로 아래)
   *
   * 실제 상황: 겨울 동해안, 파도가 약한 날
   * v1.4.1: waveFit=0 → waveMultiplier=0.2 → 최종 약 2점 (서핑 불가 판정)
   * v1.4.2: waveFit=1~2 → waveMultiplier 개선 → 최종 4점+ (서핑은 어렵지만 "아쉬움")
   */
  test('B-1: FN-4 파고 0.28m → waveFit 0점이 아닌 1~2점', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.28,       // tolMin(0.3) - 0.02 = grace zone 내
      wavePeriod: 10,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 0.3,
      swellPeriod: 10,
      waterTemperature: 22,
      windSpeed: 5,            // 약한 바람
      windGusts: 8,
      windDirection: 270,      // 오프쇼어
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'B-1: FN-4 파고 0.28m (양양 죽도)'));

    // v1.4.2: grace zone → waveFit > 0
    expect(result.detail.waveFit).toBeGreaterThan(0);
    // 최종 점수도 개선 (기존 ~2점 → 4점+)
    expect(result.surfRating).toBeGreaterThan(2);
    // PASS 유지 (안전 문제 없음)
    expect(result.levelFit.BEGINNER).toBe('PASS');
  });

  /**
   * B-2: FN-4 - 부산 송정, 파고 1.22m (tolMax=1.2 바로 위)
   *
   * 실제 상황: 가을 태풍 스웰, 파도가 살짝 큰 날
   * v1.4.1: waveFit=0 → 최종 ~2점
   * v1.4.2: waveFit=1~2 → 최종 개선
   */
  test('B-2: FN-4 파고 1.22m → 상한 grace zone 동작', () => {
    const forecast: ForecastForRating = {
      waveHeight: 1.22,       // tolMax(1.2) + 0.02 = grace zone 내
      wavePeriod: 10,
      waveDirection: 135,
      swellDirection: 135,
      swellHeight: 1.0,
      swellPeriod: 10,
      waterTemperature: 22,
      windSpeed: 5,
      windGusts: 8,
      windDirection: 315,      // 오프쇼어 (남동 해안)
    };
    const result = calculateSurfRating(BUSAN_SONGJEONG, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'B-2: FN-4 파고 1.22m (부산 송정)'));

    // 하드블록: 1.22 > 1.2 → BLOCKED (파고 하드블록)
    // 하지만 waveFit은 grace zone으로 > 0
    expect(result.detail.waveFit).toBeGreaterThan(0);
    // 하드블록은 별도로 작동 (grace zone과 무관)
    // 1.22 > 1.2 → BEGINNER BLOCKED
    // 단, FN-1 grace zone: 1.2~1.4 + beach_break + 좋은 조건 → WARNING 가능
    // 나머지 fit 평균 확인
    const otherAvg = (
      result.detail.periodFit +
      result.detail.windSpeedFit +
      result.detail.swellFit +
      result.detail.windDirFit
    ) / 4;
    console.log(`  나머지 fit 평균: ${otherAvg.toFixed(1)}`);

    // FN-1 grace zone도 동시 적용 가능
    if (otherAvg >= 7.0) {
      expect(result.levelFit.BEGINNER).toBe('WARNING');
    } else {
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    }
  });

  /**
   * B-3: FN-2 - 양양 죽도, 글래시(3km/h) + 온쇼어
   *
   * 실제 상황: 이른 아침, 바람 거의 없는데 방향이 온쇼어
   * v1.4.1: windDirFit=1 → 2점 손실 → 최종 ~5~6점
   * v1.4.2: windDirFit=7+ → 점수 크게 개선 → 최종 ~7~8점
   */
  test('B-3: FN-2 글래시 + 온쇼어 → windDirFit 보정으로 점수 개선', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.7,
      wavePeriod: 10,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 0.6,
      swellPeriod: 10,
      waterTemperature: 22,
      windSpeed: 3,            // 글래시
      windGusts: 4,            // effectiveWind = max(3, 2.8) = 3
      windDirection: 90,       // FROM 동쪽 → 온쇼어 (동해안) → 기존 1점
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'B-3: FN-2 글래시+온쇼어 (양양 죽도)'));

    // v1.4.2: 글래시이므로 windDirFit ≥ 7
    expect(result.detail.windDirFit).toBeGreaterThanOrEqual(7);
    // 최종 점수 개선: 기존 ~5~6점 → 7점+
    expect(result.surfRating).toBeGreaterThanOrEqual(7);
    // PASS 유지
    expect(result.levelFit.BEGINNER).toBe('PASS');
  });

  /**
   * B-4: FN-2 - 발리 쿠타, 약한 바람(6km/h) + 온쇼어
   *
   * 실제 상황: 발리 아침, 약한 온쇼어
   * v1.4.2: 부분 보정 적용
   */
  test('B-4: FN-2 약한 바람(6km/h) + 온쇼어 → 부분 보정', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.7,
      wavePeriod: 10,
      waveDirection: 225,
      swellDirection: 225,
      swellHeight: 0.6,
      swellPeriod: 10,
      waterTemperature: 28,
      windSpeed: 6,
      windGusts: 8,            // effectiveWind = max(6, 5.6) = 6
      windDirection: 45,       // FROM 북동 → TO 남서(225°) → 온쇼어 (발리 남서 해안)
    };
    const result = calculateSurfRating(BALI_KUTA, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'B-4: FN-2 약풍+온쇼어 (발리 쿠타)'));

    // 부분 보정: 기존 1점 → (1+7)/2 = 4점
    expect(result.detail.windDirFit).toBeGreaterThanOrEqual(3);
    // PASS 유지
    expect(result.levelFit.BEGINNER).toBe('PASS');
  });

  /**
   * B-5: FN-1 - 양양 죽도, 파고 1.25m + 완벽한 나머지 조건
   *
   * 실제 상황: 좋은 스웰 들어온 날, 파도 약간 높지만 beach_break라 서핑 가능
   * v1.4.1: BLOCKED (파고 > 1.2m)
   * v1.4.2: WARNING (grace zone 적용)
   */
  test('B-5: FN-1 파고 1.25m + 완벽 → BLOCKED → WARNING', () => {
    const forecast: ForecastForRating = {
      waveHeight: 1.25,
      wavePeriod: 12,          // periodFit = 9
      waveDirection: 45,
      swellDirection: 45,      // NE → 양양 최적
      swellHeight: 0.8,
      swellPeriod: 12,
      waterTemperature: 22,
      windSpeed: 3,            // 글래시 → windSpeedFit = 10
      windGusts: 5,
      windDirection: 270,      // 오프쇼어 → windDirFit = 10
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'B-5: FN-1 파고 1.25m+완벽 (양양 죽도)'));

    // v1.4.2: grace zone → WARNING (BLOCKED가 아님)
    expect(result.levelFit.BEGINNER).toBe('WARNING');
    expect(result.safetyReasons.some(r => r.includes('경험자 동행 필수'))).toBe(true);
    // 점수는 BLOCKED가 아니므로 추천 메시지도 개선
    expect(result.recommendationKo).not.toContain('서핑할 수 없습니다');
  });

  /**
   * B-6: FN-1 - 양양 죽도, 파고 1.35m + 완벽한 나머지 조건
   *
   * 1.4m 이하 + beach_break + 좋은 조건 → grace zone 적용
   */
  test('B-6: FN-1 파고 1.35m + 완벽 → WARNING (grace 상한 내)', () => {
    const forecast: ForecastForRating = {
      waveHeight: 1.35,
      wavePeriod: 12,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 1.0,
      swellPeriod: 12,
      waterTemperature: 22,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 270,
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'B-6: FN-1 파고 1.35m+완벽 (양양 죽도)'));

    expect(result.levelFit.BEGINNER).toBe('WARNING');
  });

  /**
   * B-7: FN-1 - 양양 죽도, 파고 1.4m 정확히 경계 + 완벽
   */
  test('B-7: FN-1 파고 1.4m (grace 상한 경계) → WARNING', () => {
    const forecast: ForecastForRating = {
      waveHeight: 1.4,
      wavePeriod: 12,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 1.0,
      swellPeriod: 12,
      waterTemperature: 22,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 270,
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'B-7: FN-1 파고 1.4m 경계 (양양 죽도)'));

    // 1.4m 이하 → grace zone 적용
    expect(result.levelFit.BEGINNER).toBe('WARNING');
  });
});

// =============================================================
// C. 과잉 보정 안전 검증
//    v1.4.2 보정이 위험한 조건을 잘못 올리지 않는지 확인
// =============================================================

describe('C. 과잉 보정 안전 검증', () => {
  /**
   * C-1: 파고 1.25m + reef_break → BLOCKED 유지 (reef 절대 완화 안 함)
   */
  test('C-1: reef에서 파고 1.25m → BLOCKED 유지', () => {
    const forecast: ForecastForRating = {
      waveHeight: 1.25,
      wavePeriod: 12,
      waveDirection: 180,
      swellDirection: 180,
      swellHeight: 0.8,
      swellPeriod: 12,
      waterTemperature: 24,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 0,
    };
    const result = calculateSurfRating(JEJU_JUNGMUN, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'C-1: reef + 파고 1.25m (제주 중문)'));

    // reef → 절대 완화 안 함
    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /**
   * C-2: 파고 1.5m + beach_break → BLOCKED 유지 (grace zone 1.4m 초과)
   */
  test('C-2: 파고 1.5m → grace zone 밖 → BLOCKED', () => {
    const forecast: ForecastForRating = {
      waveHeight: 1.5,
      wavePeriod: 12,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 1.0,
      swellPeriod: 12,
      waterTemperature: 22,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 270,
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'C-2: 파고 1.5m (양양 죽도)'));

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /**
   * C-3: 파고 1.25m + 나쁜 조건(강풍+온쇼어) → BLOCKED 유지
   * grace zone의 "나머지 fit 평균 ≥ 7.0" 조건 미충족
   */
  test('C-3: 파고 1.25m + 나쁜 조건 → BLOCKED 유지', () => {
    const forecast: ForecastForRating = {
      waveHeight: 1.25,
      wavePeriod: 5,           // periodFit = 1
      waveDirection: 45,
      swellDirection: 180,     // 방향 안 맞음
      swellHeight: 0.2,
      swellPeriod: 5,
      waterTemperature: 22,
      windSpeed: 20,           // 강풍
      windGusts: 30,
      windDirection: 90,       // 온쇼어
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'C-3: 파고 1.25m + 나쁜조건 (양양 죽도)'));

    // 나머지 fit 평균이 낮아 grace 미적용
    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /**
   * C-4: 강풍(15km/h) + 온쇼어 → windDirFit 보정 없음
   * 약풍 보정은 effectiveWind < 8에서만 적용
   */
  test('C-4: 보통 바람 + 온쇼어 → windDirFit 보정 안 됨', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.7,
      wavePeriod: 10,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 0.6,
      swellPeriod: 10,
      waterTemperature: 22,
      windSpeed: 15,           // 보통 바람
      windGusts: 18,
      windDirection: 90,       // 온쇼어
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'C-4: 보통바람+온쇼어 (양양 죽도)'));

    // effectiveWind=15 ≥ 8 → 보정 없음
    expect(result.detail.windDirFit).toBeLessThanOrEqual(1);
  });

  /**
   * C-5: 파고 0.20m → grace 밖 → waveFit 0점 유지
   */
  test('C-5: 파고 0.20m → grace 밖 → waveFit 0', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.20,
      wavePeriod: 10,
      waveDirection: 45,
      swellDirection: 45,
      swellHeight: 0.2,
      swellPeriod: 10,
      waterTemperature: 22,
      windSpeed: 5,
      windGusts: 8,
      windDirection: 270,
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'C-5: 파고 0.20m (양양 죽도)'));

    // tolMin(0.3) - 0.05 = 0.25, 0.20 < 0.25 → grace 밖 → 0점
    expect(result.detail.waveFit).toBe(0);
  });

  /**
   * C-6: 울루와뚜(상급 reef) + BEGINNER → BLOCKED 유지
   * 아무리 좋은 조건이라도 상급 reef는 차단
   */
  test('C-6: 상급 reef → BEGINNER BLOCKED (변함없음)', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.8,
      wavePeriod: 14,
      waveDirection: 225,
      swellDirection: 225,
      swellHeight: 1.0,
      swellPeriod: 14,
      waterTemperature: 28,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 45,
    };
    const result = calculateSurfRating(BALI_ULUWATU, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'C-6: 상급 reef (발리 울루와뚜)'));

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  /**
   * C-7: 품질 게이트 + 약풍 보정 동시 적용 시
   * 글래시 + 온쇼어 + 짧은 주기 → windDirFit 보정으로 7점이 되면
   * 품질 게이트(windDirFit ≤ 2) 조건이 미충족 → 게이트 안 걸림
   * 이게 올바른 동작인지 확인 (글래시면 온쇼어 의미 없으므로 OK)
   */
  test('C-7: 글래시 + 온쇼어 + 짧은 주기 → windDirFit 보정으로 품질 게이트 회피', () => {
    const forecast: ForecastForRating = {
      waveHeight: 0.7,
      wavePeriod: 5,           // periodFit = 1
      waveDirection: 90,
      swellDirection: 45,
      swellHeight: 0.2,
      swellPeriod: 5,
      waterTemperature: 22,
      windSpeed: 2,            // 글래시
      windGusts: 3,            // effectiveWind = max(2, 2.1) = 2.1 < 5
      windDirection: 90,       // 온쇼어 → 기존 windDirFit=1 → 보정 후 7
    };
    const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
    console.log(fmt(result, 'C-7: 글래시+온쇼어+짧은주기 (양양 죽도)'));

    // 글래시이므로 windDirFit ≥ 7 → 품질 게이트 windDirFit ≤ 2 조건 미충족
    expect(result.detail.windDirFit).toBeGreaterThanOrEqual(7);
    // periodFit은 여전히 낮지만, 품질 게이트는 AND 조건이라 미발동
    // 이는 올바름: 글래시에서 온쇼어는 무의미하므로 품질 게이트가 걸릴 이유 없음
    expect(result.detail.periodFit).toBeLessThanOrEqual(1);
    // 점수: 주기가 짧아 여전히 낮을 수 있지만 4.0 상한은 안 걸림
    // waveFit(10) + periodFit(1) + windSpeedFit(10) + swellFit(?) + windDirFit(7)
    // → 상한 없이 자연 점수
  });

  /**
   * C-8: 종합 안전 테스트 - 위험한 시나리오 20개 랜덤 조합
   * 모든 "위험" 시나리오에서 BEGINNER가 PASS가 되면 안 됨
   */
  test('C-8: 위험 시나리오에서 BEGINNER PASS 되지 않는지 확인', () => {
    const dangerousForecasts: { label: string; forecast: ForecastForRating }[] = [
      {
        label: '파고 2.0m',
        forecast: {
          waveHeight: 2.0, wavePeriod: 10, waveDirection: 45, swellDirection: 45,
          swellHeight: 1.5, swellPeriod: 10, waterTemperature: 22,
          windSpeed: 5, windGusts: 8, windDirection: 270,
        },
      },
      {
        label: '파고 1.5m + 강풍',
        forecast: {
          waveHeight: 1.5, wavePeriod: 8, waveDirection: 45, swellDirection: 45,
          swellHeight: 1.0, swellPeriod: 8, waterTemperature: 22,
          windSpeed: 25, windGusts: 35, windDirection: 90,
        },
      },
      {
        label: '수온 9°C',
        forecast: {
          waveHeight: 0.7, wavePeriod: 10, waveDirection: 45, swellDirection: 45,
          swellHeight: 0.6, swellPeriod: 10, waterTemperature: 9,
          windSpeed: 5, windGusts: 8, windDirection: 270,
        },
      },
      {
        label: 'gust 50km/h',
        forecast: {
          waveHeight: 0.7, wavePeriod: 10, waveDirection: 45, swellDirection: 45,
          swellHeight: 0.6, swellPeriod: 10, waterTemperature: 22,
          windSpeed: 15, windGusts: 50, windDirection: 270,
        },
      },
      {
        label: '파고 1.41m + 완벽 조건',
        forecast: {
          waveHeight: 1.41, wavePeriod: 12, waveDirection: 45, swellDirection: 45,
          swellHeight: 0.8, swellPeriod: 12, waterTemperature: 22,
          windSpeed: 3, windGusts: 5, windDirection: 270,
        },
      },
    ];

    for (const { label, forecast } of dangerousForecasts) {
      const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
      console.log(`  C-8 [${label}]: BEG=${result.levelFit.BEGINNER} 점수=${result.surfRating}`);

      // 위험한 시나리오에서 BEGINNER가 PASS이면 안 됨
      expect(result.levelFit.BEGINNER).not.toBe('PASS');
    }
  });
});

// =============================================================
// D. 실제 스팟 종합 시나리오 (before/after 비교 로그)
// =============================================================

describe('D. 실제 스팟 종합 비교 (로그 확인용)', () => {
  /**
   * 다양한 실제 시나리오에서 v1.4.2 결과를 로그로 출력
   * 테스트 통과 여부보다 "결과가 현실적인지" 육안 확인용
   */
  test('D-1: 양양 죽도 - 6개 시나리오 종합', () => {
    const scenarios = [
      { label: '완벽한 날', forecast: { waveHeight: 0.7, wavePeriod: 12, waveDirection: 45, swellDirection: 45, swellHeight: 0.8, swellPeriod: 12, waterTemperature: 22, windSpeed: 3, windGusts: 5, windDirection: 270 } as ForecastForRating },
      { label: '파고 살짝 부족(0.28m)', forecast: { waveHeight: 0.28, wavePeriod: 10, waveDirection: 45, swellDirection: 45, swellHeight: 0.3, swellPeriod: 10, waterTemperature: 22, windSpeed: 5, windGusts: 8, windDirection: 270 } as ForecastForRating },
      { label: '글래시+온쇼어', forecast: { waveHeight: 0.7, wavePeriod: 10, waveDirection: 45, swellDirection: 45, swellHeight: 0.6, swellPeriod: 10, waterTemperature: 22, windSpeed: 3, windGusts: 4, windDirection: 90 } as ForecastForRating },
      { label: '파고 1.25m+완벽', forecast: { waveHeight: 1.25, wavePeriod: 12, waveDirection: 45, swellDirection: 45, swellHeight: 0.8, swellPeriod: 12, waterTemperature: 22, windSpeed: 3, windGusts: 5, windDirection: 270 } as ForecastForRating },
      { label: '파고 1.25m+강풍', forecast: { waveHeight: 1.25, wavePeriod: 6, waveDirection: 45, swellDirection: 180, swellHeight: 0.2, swellPeriod: 6, waterTemperature: 22, windSpeed: 20, windGusts: 30, windDirection: 90 } as ForecastForRating },
      { label: '완전 플랫(0.1m)', forecast: { waveHeight: 0.1, wavePeriod: 5, waveDirection: 45, swellDirection: 45, swellHeight: 0.1, swellPeriod: 5, waterTemperature: 22, windSpeed: 3, windGusts: 5, windDirection: 270 } as ForecastForRating },
    ];

    console.log('\n========== 양양 죽도 v1.4.2 종합 ==========');
    for (const { label, forecast } of scenarios) {
      const result = calculateSurfRating(YANGYANG_JUKDO, forecast, Difficulty.BEGINNER);
      console.log(fmt(result, label));
    }

    // 최소한 완벽한 날은 높은 점수
    const perfect = calculateSurfRating(YANGYANG_JUKDO, scenarios[0].forecast, Difficulty.BEGINNER);
    expect(perfect.surfRating).toBeGreaterThanOrEqual(8);
    expect(perfect.levelFit.BEGINNER).toBe('PASS');
  });
});
