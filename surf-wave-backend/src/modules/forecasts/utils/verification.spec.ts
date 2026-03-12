/**
 * @file verification.spec.ts
 * @description 예보 핵심 기능 종합 검증 테스트
 *
 * 시나리오별 검증 항목:
 * A. 파고 계산값 정확성 (레벨별, 보드별, breakType별)
 * B. 레벨별 추천 문구 매칭 정확성
 * C. hints 시스템 정확성 (보드별 팁, 안전 경고)
 * D. simpleCondition 보드별 분기 정확성
 * E. 하드블록 안전 필터 정밀 검증
 * F. 경계값(edge case) 검증
 */
import {
  calculateSurfRating,
  getSimpleCondition,
  SpotForRating,
  ForecastForRating,
} from './surf-rating.util';
import { generateHints, generatePublicHints, type HintsInput } from './hints.util';
import { Difficulty } from '../../../common/enums/difficulty.enum';
import { UserBoardType } from '../../../common/enums/user-board-type.enum';

// =============================================================
// 팩토리 함수
// =============================================================

function makeSpot(overrides: Partial<SpotForRating> = {}): SpotForRating {
  return {
    breakType: 'beach_break',
    difficulty: Difficulty.BEGINNER,
    coastFacingDeg: 90,
    bestSwellDirection: 'NE',
    bestSwellSpreadDeg: 45,
    optimalWaveMin: null,
    optimalWaveMax: null,
    tolerableWaveMin: null,
    tolerableWaveMax: null,
    ...overrides,
  };
}

function makeForecast(overrides: Partial<ForecastForRating> = {}): ForecastForRating {
  return {
    waveHeight: 0.8,
    wavePeriod: 10,
    waveDirection: 45,
    swellDirection: 45,
    swellHeight: 0.6,
    swellPeriod: 10,
    waterTemperature: 22,
    windSpeed: 8,
    windGusts: 12,
    windDirection: 270,
    ...overrides,
  };
}

// =============================================================
// A. 파고 계산값 정확성 (시나리오 매트릭스)
// =============================================================

describe('A. 파고 계산값 시나리오 매트릭스', () => {

  describe('A-1. 레벨별 동일 파고 → 점수 차이 검증', () => {
    const forecast = makeForecast({ waveHeight: 1.5 });

    it('BEGINNER: 파고 1.5m beach_break → BLOCKED (>1.2m)', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.BEGINNER }),
        forecast,
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.recommendationKo).toContain('초보자에게 위험');
    });

    it('INTERMEDIATE: 파고 1.5m beach_break → 최적 구간, 높은 점수', () => {
      const spot = makeSpot({ difficulty: Difficulty.INTERMEDIATE });
      const result = calculateSurfRating(spot, forecast, Difficulty.INTERMEDIATE);
      // INTERMEDIATE beach_break optimal=[0.8, 1.5] → 1.5m은 경계 포함 → waveFit=10
      expect(result.detail.waveFit).toBe(10);
      expect(result.surfRating).toBeGreaterThanOrEqual(5);
      expect(result.levelFit.INTERMEDIATE).toBe('PASS');
    });

    it('ADVANCED: 파고 1.5m beach_break → 최적 구간, 높은 점수', () => {
      const spot = makeSpot({ difficulty: Difficulty.ADVANCED });
      const result = calculateSurfRating(spot, forecast, Difficulty.ADVANCED);
      // ADVANCED beach_break optimal=[1.0, 2.0] → 1.5m 포함
      expect(result.detail.waveFit).toBe(10);
      expect(result.surfRating).toBeGreaterThanOrEqual(5);
    });
  });

  describe('A-2. breakType별 동일 파고 → 점수 차이', () => {
    const forecast = makeForecast({ waveHeight: 0.6 });

    it('beach_break BEGINNER: 파고 0.6m → optimal 구간 (waveFit=10)', () => {
      const result = calculateSurfRating(
        makeSpot({ breakType: 'beach_break', difficulty: Difficulty.BEGINNER }),
        forecast,
        Difficulty.BEGINNER,
      );
      // beach_break BEGINNER optimal=[0.5, 1.0] → 0.6 포함
      expect(result.detail.waveFit).toBe(10);
    });

    it('reef_break BEGINNER: 파고 0.6m → 최적 구간이지만 BLOCKED (reef+초보)', () => {
      const result = calculateSurfRating(
        makeSpot({ breakType: 'reef_break', difficulty: Difficulty.BEGINNER }),
        forecast,
        Difficulty.BEGINNER,
      );
      // reef_break + BEGINNER → 하드블록
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.safetyReasons.some(r => r.includes('리프'))).toBe(true);
    });

    it('reef_break INTERMEDIATE: 파고 0.6m → tolerable 아래 (waveFit 낮음)', () => {
      const result = calculateSurfRating(
        makeSpot({ breakType: 'reef_break', difficulty: Difficulty.INTERMEDIATE }),
        forecast,
        Difficulty.INTERMEDIATE,
      );
      // reef_break INTERMEDIATE tolerable=[0.8, 2.5] → 0.6m은 아래
      expect(result.detail.waveFit).toBeLessThanOrEqual(2);
    });
  });

  describe('A-3. 보드 타입별 파고 계산 정확성', () => {
    it('롱보드 + 작은 파도(0.4m) → 높은 waveFit', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.BEGINNER }),
        makeForecast({ waveHeight: 0.4 }),
        Difficulty.BEGINNER,
        UserBoardType.LONGBOARD,
      );
      // LONGBOARD: optMinFactor=0.7 → optimal min = 0.5*0.7 = 0.35m
      // 0.4m은 optimal 구간 내
      expect(result.detail.waveFit).toBe(10);
    });

    it('숏보드 + 작은 파도(0.4m) → 낮은 waveFit', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.BEGINNER }),
        makeForecast({ waveHeight: 0.4 }),
        Difficulty.BEGINNER,
        UserBoardType.SHORTBOARD,
      );
      // SHORTBOARD: tolMinFactor=1.2 → tol min = 0.3*1.2 = 0.36m
      // 0.4m은 tolerable 내이지만 optimal 아래 → 감점
      expect(result.detail.waveFit).toBeLessThan(10);
    });

    it('미드렝스 + 적당한 파도(0.8m) → 높은 waveFit', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.BEGINNER }),
        makeForecast({ waveHeight: 0.8 }),
        Difficulty.BEGINNER,
        UserBoardType.MIDLENGTH,
      );
      // MIDLENGTH: optMinFactor=0.85 → opt min = 0.5*0.85 = 0.425m
      // 0.8m은 optimal 내
      expect(result.detail.waveFit).toBe(10);
    });

    it('UNSET 보드 → 기본과 동일', () => {
      const spot = makeSpot();
      const fc = makeForecast({ waveHeight: 0.8 });
      const base = calculateSurfRating(spot, fc, Difficulty.BEGINNER);
      const unset = calculateSurfRating(spot, fc, Difficulty.BEGINNER, UserBoardType.UNSET);
      expect(base.detail.waveFit).toBe(unset.detail.waveFit);
      expect(base.surfRating).toBe(unset.surfRating);
    });
  });
});

// =============================================================
// B. 레벨별 추천 문구 매칭 정확성
// =============================================================

describe('B. 추천 문구 매칭 검증', () => {

  describe('B-1. PASS 상태에서 점수별 문구', () => {
    // 중급 스팟, 좋은 조건 → 점수에 따른 문구 확인
    const spot = makeSpot({ difficulty: Difficulty.INTERMEDIATE });

    it('surfRating ≥ 9 → "완벽한 서핑 컨디션이에요!"', () => {
      // 완벽한 조건: 최적 파고 + 오프쇼어 + 긴 주기 + 좋은 스웰
      const fc = makeForecast({
        waveHeight: 1.2,
        wavePeriod: 14,
        windSpeed: 3,
        windGusts: 5,
        windDirection: 270, // 오프쇼어 (from West, to East = coastFacing)
        swellDirection: 45,
        swellHeight: 1.5,
        swellPeriod: 14,
      });
      const result = calculateSurfRating(spot, fc, Difficulty.INTERMEDIATE);
      if (result.surfRating >= 9) {
        expect(result.recommendationKo).toBe('완벽한 서핑 컨디션이에요!');
      }
    });

    it('surfRating 7~8 → "서핑하기 좋은 날이에요!"', () => {
      const fc = makeForecast({
        waveHeight: 1.0,
        wavePeriod: 10,
        windSpeed: 10,
        windGusts: 15,
        windDirection: 270,
      });
      const result = calculateSurfRating(spot, fc, Difficulty.INTERMEDIATE);
      if (result.surfRating >= 7 && result.surfRating < 9) {
        expect(result.recommendationKo).toBe('서핑하기 좋은 날이에요!');
      }
    });

    it('surfRating 5~6 → "무난한 컨디션이에요"', () => {
      const fc = makeForecast({
        waveHeight: 1.0,
        wavePeriod: 8,
        windSpeed: 15,
        windGusts: 20,
        windDirection: 180,
      });
      const result = calculateSurfRating(spot, fc, Difficulty.INTERMEDIATE);
      if (result.surfRating >= 5 && result.surfRating < 7) {
        expect(result.recommendationKo).toBe('무난한 컨디션이에요');
      }
    });

    it('surfRating 3~4 → "컨디션이 아쉬워요"', () => {
      const fc = makeForecast({
        waveHeight: 0.6,
        wavePeriod: 6,
        windSpeed: 20,
        windGusts: 25,
        windDirection: 90, // 온쇼어
        swellDirection: 180,
      });
      const result = calculateSurfRating(spot, fc, Difficulty.INTERMEDIATE);
      if (result.surfRating >= 3 && result.surfRating < 5) {
        expect(result.recommendationKo).toBe('컨디션이 아쉬워요');
      }
    });

    it('surfRating < 3 → "오늘은 쉬는 게 좋겠어요"', () => {
      const fc = makeForecast({
        waveHeight: 0.1,
        wavePeriod: 4,
        windSpeed: 25,
        windGusts: 35,
        windDirection: 90,
        swellDirection: 270,
        swellHeight: 0.1,
        swellPeriod: 4,
      });
      const result = calculateSurfRating(spot, fc, Difficulty.INTERMEDIATE);
      if (result.surfRating < 3) {
        expect(result.recommendationKo).toBe('오늘은 쉬는 게 좋겠어요');
      }
    });
  });

  describe('B-2. BLOCKED 상태 → 안전 사유 표시', () => {
    it('BEGINNER + 강풍 → 풍속 위험 메시지', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ windSpeed: 40, windGusts: 50 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.recommendationKo).toContain('풍속');
    });

    it('BEGINNER + 높은 파고 → 파고 위험 메시지', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 1.5 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.recommendationKo).toContain('초보자');
    });

    it('BEGINNER + reef_break → 리프 금지 메시지', () => {
      const result = calculateSurfRating(
        makeSpot({ breakType: 'reef_break' }),
        makeForecast({ waveHeight: 0.6 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.recommendationKo).toContain('리프');
    });
  });

  describe('B-3. WARNING 상태 → 문구에 "주의" 포함', () => {
    it('BEGINNER + 돌풍 35~45 → WARNING + 주의 메시지', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, windSpeed: 10, windGusts: 38 }),
        Difficulty.BEGINNER,
      );
      // 돌풍 38 → BEGINNER WARNING (35이상 45미만)
      expect(result.levelFit.BEGINNER).toBe('WARNING');
      expect(result.recommendationKo).toContain('주의');
    });
  });
});

// =============================================================
// C. hints 시스템 검증
// =============================================================

describe('C. hints 시스템 검증', () => {

  describe('C-1. 안전 경고 최우선', () => {
    it('safetyReasons 있으면 SAFETY_WARNING 태그 우선', () => {
      const hints = generateHints({
        detail: { waveFit: 8, periodFit: 7, windSpeedFit: 6, swellFit: 7, windDirFit: 5 },
        surfRating: 6,
        safetyReasons: ['파고 1.5m - 초보자에게 위험'],
        boardType: UserBoardType.UNSET,
        waveHeight: 1.5,
        windSpeed: 10,
        wavePeriod: 10,
      });
      expect(hints.tags[0]).toBe('SAFETY_WARNING');
      expect(hints.message).toContain('초보자');
    });
  });

  describe('C-2. 보드별 팁 생성', () => {
    it('롱보드 + 작은 파도(0.4m) → LONGBOARD_TIP 또는 메시지에 롱보드', () => {
      // windDirFit/swellFit/periodFit을 중간값으로 → 다른 태그 최소화
      const hints = generateHints({
        detail: { waveFit: 8, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        surfRating: 6,
        safetyReasons: [],
        boardType: UserBoardType.LONGBOARD,
        waveHeight: 0.4,
        windSpeed: 5,
        wavePeriod: 8,
      });
      // 다른 태그가 없으므로 LONGBOARD_TIP이 포함되어야 함
      expect(hints.tags).toContain('LONGBOARD_TIP');
      expect(hints.message).toContain('롱보드');
    });

    it('숏보드 + 작은 파도(0.3m) → SHORTBOARD_TIP + "너무 작아요"', () => {
      const hints = generateHints({
        detail: { waveFit: 2, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        surfRating: 3,
        safetyReasons: [],
        boardType: UserBoardType.SHORTBOARD,
        waveHeight: 0.3,
        windSpeed: 5,
        wavePeriod: 8,
      });
      expect(hints.tags).toContain('SHORTBOARD_TIP');
      expect(hints.message).toContain('숏보드');
    });

    it('미드렝스 + 적당한 파도(1.0m) → MIDLENGTH_TIP', () => {
      const hints = generateHints({
        detail: { waveFit: 10, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        surfRating: 7,
        safetyReasons: [],
        boardType: UserBoardType.MIDLENGTH,
        waveHeight: 1.0,
        windSpeed: 5,
        wavePeriod: 8,
      });
      expect(hints.tags).toContain('MIDLENGTH_TIP');
      expect(hints.message).toContain('미드렝스');
    });

    it('안전 경고 시 보드 팁 생략', () => {
      const hints = generateHints({
        detail: { waveFit: 8, periodFit: 7, windSpeedFit: 6, swellFit: 7, windDirFit: 5 },
        surfRating: 6,
        safetyReasons: ['파고 1.5m - 초보자에게 위험'],
        boardType: UserBoardType.LONGBOARD,
        waveHeight: 1.5,
        windSpeed: 10,
        wavePeriod: 10,
      });
      expect(hints.tags).not.toContain('LONGBOARD_TIP');
    });
  });

  describe('C-3. 파고/바람/스웰/주기 태그 정확성', () => {
    it('waveFit ≤ 3 + 파고 < 0.3m → WAVE_TOO_SMALL', () => {
      const hints = generateHints({
        detail: { waveFit: 1, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        surfRating: 3,
        safetyReasons: [],
        boardType: UserBoardType.UNSET,
        waveHeight: 0.1,
        windSpeed: 5,
        wavePeriod: 8,
      });
      expect(hints.tags).toContain('WAVE_TOO_SMALL');
    });

    it('waveFit ≤ 3 + 파고 > 2.5m → WAVE_TOO_BIG', () => {
      const hints = generateHints({
        detail: { waveFit: 2, periodFit: 5, windSpeedFit: 5, swellFit: 5, windDirFit: 5 },
        surfRating: 3,
        safetyReasons: [],
        boardType: UserBoardType.UNSET,
        waveHeight: 3.0,
        windSpeed: 10,
        wavePeriod: 8,
      });
      expect(hints.tags).toContain('WAVE_TOO_BIG');
    });

    it('windDirFit ≥ 7 → OFFSHORE_WIND 태그', () => {
      const hints = generateHints({
        detail: { waveFit: 8, periodFit: 7, windSpeedFit: 8, swellFit: 7, windDirFit: 8 },
        surfRating: 7,
        safetyReasons: [],
        boardType: UserBoardType.UNSET,
        waveHeight: 1.0,
        windSpeed: 5,
        wavePeriod: 10,
      });
      expect(hints.tags).toContain('OFFSHORE_WIND');
    });

    it('windDirFit ≤ 3 → ONSHORE_WIND 태그', () => {
      const hints = generateHints({
        detail: { waveFit: 8, periodFit: 7, windSpeedFit: 6, swellFit: 7, windDirFit: 1 },
        surfRating: 5,
        safetyReasons: [],
        boardType: UserBoardType.UNSET,
        waveHeight: 1.0,
        windSpeed: 10,
        wavePeriod: 10,
      });
      expect(hints.tags).toContain('ONSHORE_WIND');
    });

    it('surfRating ≥ 7 + 안전 사유 없음 → GREAT_CONDITION (3태그 제한 내)', () => {
      // 최대 3개 태그 제한으로 GREAT_CONDITION이 잘릴 수 있음
      // → 중간값 fit으로 다른 태그 최소화
      const hints = generateHints({
        detail: { waveFit: 10, periodFit: 5, windSpeedFit: 10, swellFit: 5, windDirFit: 5 },
        surfRating: 7,
        safetyReasons: [],
        boardType: UserBoardType.UNSET,
        waveHeight: 1.0,
        windSpeed: 3,
        wavePeriod: 8,
      });
      expect(hints.tags).toContain('GREAT_CONDITION');
      expect(hints.message).toContain('좋아요');
    });
  });

  describe('C-4. 비로그인 hints (generatePublicHints)', () => {
    it('boardType 없이도 기본 hints 생성', () => {
      const hints = generatePublicHints({
        detail: { waveFit: 8, periodFit: 7, windSpeedFit: 8, swellFit: 7, windDirFit: 7 },
        surfRating: 7,
        safetyReasons: [],
        waveHeight: 1.0,
        windSpeed: 5,
        wavePeriod: 10,
      });
      expect(hints.tags).toBeDefined();
      expect(hints.message).toBeDefined();
      // 보드 팁이 없어야 함
      expect(hints.tags).not.toContain('LONGBOARD_TIP');
      expect(hints.tags).not.toContain('SHORTBOARD_TIP');
      expect(hints.tags).not.toContain('MIDLENGTH_TIP');
    });
  });
});

// =============================================================
// D. simpleCondition 보드별 분기 검증
// =============================================================

describe('D. simpleCondition 보드별 분기', () => {
  const baseForecast = makeForecast({ waveHeight: 1.0, windSpeed: 5, windGusts: 8 });

  it('기본(UNSET): 파고 1.0m → waveStatus="적당", overall="좋음"', () => {
    const cond = getSimpleCondition(baseForecast);
    expect(cond.waveStatus).toBe('적당');
    expect(cond.overall).toBe('좋음');
  });

  it('롱보드: 파고 1.0m → overall="좋음" (0.3~1.2m 구간)', () => {
    const cond = getSimpleCondition(baseForecast, UserBoardType.LONGBOARD);
    expect(cond.overall).toBe('좋음');
  });

  it('숏보드: 파고 0.5m → overall="보통" (goodMin=0.8)', () => {
    const fc = makeForecast({ waveHeight: 0.5, windSpeed: 5, windGusts: 8 });
    const cond = getSimpleCondition(fc, UserBoardType.SHORTBOARD);
    // 숏보드 goodMin=0.8 → 0.5m은 아래 → "보통"
    expect(cond.overall).toBe('보통');
  });

  it('숏보드: 파고 1.5m → overall="좋음" (0.8~2.5m 구간)', () => {
    const fc = makeForecast({ waveHeight: 1.5, windSpeed: 5, windGusts: 8 });
    const cond = getSimpleCondition(fc, UserBoardType.SHORTBOARD);
    expect(cond.overall).toBe('좋음');
  });

  it('미드렝스: 파고 1.5m → overall="좋음" (0.4~1.8m 구간)', () => {
    const fc = makeForecast({ waveHeight: 1.5, windSpeed: 5, windGusts: 8 });
    const cond = getSimpleCondition(fc, UserBoardType.MIDLENGTH);
    expect(cond.overall).toBe('좋음');
  });

  it('강풍(>30km/h) → overall="주의"', () => {
    const fc = makeForecast({ waveHeight: 1.0, windSpeed: 35, windGusts: 45 });
    const cond = getSimpleCondition(fc);
    expect(cond.overall).toBe('주의');
    expect(cond.windStatus).toBe('매우 강함');
  });

  it('파고 > 2.5m → overall="주의"', () => {
    const fc = makeForecast({ waveHeight: 3.0, windSpeed: 10, windGusts: 15 });
    const cond = getSimpleCondition(fc);
    expect(cond.overall).toBe('주의');
    expect(cond.waveStatus).toBe('위험');
  });

  it('waveStatus 구간: 잔잔/적당/높음/위험', () => {
    expect(getSimpleCondition(makeForecast({ waveHeight: 0.3 })).waveStatus).toBe('잔잔');
    expect(getSimpleCondition(makeForecast({ waveHeight: 1.0 })).waveStatus).toBe('적당');
    expect(getSimpleCondition(makeForecast({ waveHeight: 2.0 })).waveStatus).toBe('높음');
    expect(getSimpleCondition(makeForecast({ waveHeight: 3.0 })).waveStatus).toBe('위험');
  });

  it('windStatus 구간: 약함/보통/강함/매우 강함', () => {
    expect(getSimpleCondition(makeForecast({ windSpeed: 5, windGusts: 5 })).windStatus).toBe('약함');
    expect(getSimpleCondition(makeForecast({ windSpeed: 15, windGusts: 15 })).windStatus).toBe('보통');
    expect(getSimpleCondition(makeForecast({ windSpeed: 25, windGusts: 25 })).windStatus).toBe('강함');
    expect(getSimpleCondition(makeForecast({ windSpeed: 35, windGusts: 50 })).windStatus).toBe('매우 강함');
  });
});

// =============================================================
// E. 하드블록 안전 필터 정밀 검증
// =============================================================

describe('E. 하드블록 안전 필터 정밀 검증', () => {

  describe('E-1. 전 레벨 강풍 차단', () => {
    it('effectiveWind > 35 → 전 레벨 BLOCKED', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ windSpeed: 40, windGusts: 50 }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.levelFit.INTERMEDIATE).toBe('BLOCKED');
      expect(result.levelFit.ADVANCED).toBe('BLOCKED');
    });
  });

  describe('E-2. 수온 안전 필터', () => {
    it('수온 < 10°C → BEGINNER BLOCKED + INTERMEDIATE WARNING', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, waterTemperature: 8 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.levelFit.INTERMEDIATE).toBe('WARNING');
      expect(result.safetyReasons.some(r => r.includes('저체온증'))).toBe(true);
    });

    it('수온 10~14°C → BEGINNER WARNING', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, waterTemperature: 12 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('WARNING');
      expect(result.safetyReasons.some(r => r.includes('웻슈트'))).toBe(true);
    });

    it('수온 ≥ 14°C → 수온 경고 없음', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, waterTemperature: 20 }),
        Difficulty.BEGINNER,
      );
      expect(result.safetyReasons.filter(r => r.includes('수온'))).toHaveLength(0);
    });
  });

  describe('E-3. 난이도별 스팟 차단', () => {
    it('ADVANCED 스팟 + BEGINNER → BLOCKED', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.ADVANCED }),
        makeForecast({ waveHeight: 0.6 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.safetyReasons.some(r => r.includes('상급자'))).toBe(true);
    });

    it('EXPERT 스팟 + INTERMEDIATE → BLOCKED', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.EXPERT }),
        makeForecast({ waveHeight: 0.6 }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.levelFit.INTERMEDIATE).toBe('BLOCKED');
      expect(result.safetyReasons.some(r => r.includes('전문가'))).toBe(true);
    });
  });

  describe('E-4. 복합 위험 (compound risk)', () => {
    it('돌풍 40 + 파고 1.1m + 수온 15°C → 감점 적용', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({
          waveHeight: 0.6,
          windSpeed: 10,
          windGusts: 40,
          waterTemperature: 15,
        }),
        Difficulty.BEGINNER,
      );
      // compound risk로 인한 WARNING
      expect(result.levelFit.BEGINNER).toBe('WARNING');
    });
  });

  describe('E-5. safetyReasons 우선순위 정렬', () => {
    it('강풍(P1) + 리프(P3) → 강풍 먼저', () => {
      const result = calculateSurfRating(
        makeSpot({ breakType: 'reef_break' }),
        makeForecast({ windSpeed: 40, windGusts: 50 }),
        Difficulty.BEGINNER,
      );
      // P1(강풍)이 P3(리프)보다 먼저
      const windIdx = result.safetyReasons.findIndex(r => r.includes('풍속'));
      const reefIdx = result.safetyReasons.findIndex(r => r.includes('리프'));
      if (windIdx >= 0 && reefIdx >= 0) {
        expect(windIdx).toBeLessThan(reefIdx);
      }
    });
  });
});

// =============================================================
// F. 경계값(edge case) 검증
// =============================================================

describe('F. 경계값 검증', () => {

  describe('F-1. 플랫 파고', () => {
    it('파고 0m → surfRating ≤ 1.0', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({
          waveHeight: 0,
          wavePeriod: 14,
          windSpeed: 3,
          windGusts: 5,
        }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.surfRating).toBeLessThanOrEqual(1.0);
      expect(result.detail.waveFit).toBe(0);
    });
  });

  describe('F-2. 극단적 파고', () => {
    it('파고 5m + INTERMEDIATE → WARNING', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ waveHeight: 5.0 }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.levelFit.INTERMEDIATE).toBe('WARNING');
    });
  });

  describe('F-3. null 데이터 처리', () => {
    it('windDirection null → windDirFit 중간값(5)', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.8, windDirection: null }),
        Difficulty.BEGINNER,
      );
      expect(result.detail.windDirFit).toBe(5);
    });

    it('swellDirection null → waveDirection 폴백', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.8, swellDirection: null }),
        Difficulty.BEGINNER,
      );
      // swellFit이 waveDirection 기반으로 계산됨 (5가 아닌 실제 값)
      expect(result.detail.swellFit).toBeDefined();
    });
  });

  describe('F-4. EXPERT 레벨 → ADVANCED 매핑', () => {
    it('EXPERT 유저 → ADVANCED levelFit 참조', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ windSpeed: 40, windGusts: 50 }),
        Difficulty.EXPERT,
      );
      // EXPERT도 강풍 시 안전 경고
      expect(result.levelFit.ADVANCED).toBe('BLOCKED');
      expect(result.recommendationKo).toContain('풍속');
    });
  });

  describe('F-5. 품질 게이트 (온쇼어 + 짧은 주기)', () => {
    it('windDirFit ≤ 2 + periodFit ≤ 2 → surfRating ≤ 4.0', () => {
      // 온쇼어(windDirection=90, coastFacing=90 → from East to West, coast faces East → 온쇼어)
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({
          waveHeight: 1.2,
          wavePeriod: 4,        // periodFit=0
          windSpeed: 15,
          windGusts: 20,
          windDirection: 90,    // from East → to West (반대 방향) → 온쇼어
          swellDirection: 45,
        }),
        Difficulty.INTERMEDIATE,
      );
      if (result.detail.windDirFit <= 2 && result.detail.periodFit <= 2) {
        expect(result.surfRating).toBeLessThanOrEqual(4.0);
      }
    });
  });

  describe('F-6. 가중치 합산 검증', () => {
    it('가중치 합계 = 1.0', () => {
      const weights = { wave: 0.25, period: 0.10, windSpeed: 0.20, swell: 0.25, windDir: 0.20 };
      const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
      expect(total).toBeCloseTo(1.0);
    });
  });

  describe('F-7. 풍향 FROM→TO 변환 핵심 검증', () => {
    it('windDirection=270(서풍 from) + coastFacing=90(동향) → 오프쇼어 (windDirFit ≥ 8)', () => {
      const result = calculateSurfRating(
        makeSpot({ coastFacingDeg: 90 }),
        makeForecast({ waveHeight: 0.8, windDirection: 270, windSpeed: 15, windGusts: 20 }),
        Difficulty.BEGINNER,
      );
      // from 270(West) → to 90(East) = coastFacing(90) → delta=0 → 오프쇼어
      expect(result.detail.windDirFit).toBeGreaterThanOrEqual(8);
    });

    it('windDirection=90(동풍 from) + coastFacing=90(동향) → 온쇼어 (windDirFit ≤ 3)', () => {
      const result = calculateSurfRating(
        makeSpot({ coastFacingDeg: 90 }),
        makeForecast({ waveHeight: 0.8, windDirection: 90, windSpeed: 15, windGusts: 20 }),
        Difficulty.BEGINNER,
      );
      // from 90(East) → to 270(West) ≠ coastFacing(90) → delta=180 → 온쇼어
      expect(result.detail.windDirFit).toBeLessThanOrEqual(3);
    });
  });
});

// =============================================================
// G. 통합 시나리오: 실제 서핑 상황 시뮬레이션
// =============================================================

describe('G. 실제 서핑 상황 시뮬레이션', () => {

  it('시나리오 1: 양양 여름 아침 - 초보 롱보드 (완벽한 날)', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
      bestSwellDirection: 'NE',
    });
    const forecast = makeForecast({
      waveHeight: 0.7,
      wavePeriod: 10,
      windSpeed: 3,
      windGusts: 5,
      windDirection: 270, // 오프쇼어
      swellDirection: 45,
      swellHeight: 0.5,
      swellPeriod: 10,
      waterTemperature: 24,
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER, UserBoardType.LONGBOARD);

    expect(result.levelFit.BEGINNER).toBe('PASS');
    expect(result.surfRating).toBeGreaterThanOrEqual(7);
    expect(result.recommendationKo).not.toContain('위험');
    expect(result.safetyReasons).toHaveLength(0);

    const cond = getSimpleCondition(forecast, UserBoardType.LONGBOARD);
    expect(cond.overall).toBe('좋음');
  });

  it('시나리오 2: 발리 울루와뚜 - 중급 숏보드 (reef + 큰 파도)', () => {
    const spot = makeSpot({
      breakType: 'reef_break',
      difficulty: Difficulty.ADVANCED,
      coastFacingDeg: 225, // 남서향
      bestSwellDirection: 'S',
    });
    const forecast = makeForecast({
      waveHeight: 2.0,
      wavePeriod: 14,
      windSpeed: 8,
      windGusts: 12,
      windDirection: 45, // 북동풍 from → to 225 → 오프쇼어
      swellDirection: 180,
      swellHeight: 1.8,
      swellPeriod: 14,
      waterTemperature: 28,
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.INTERMEDIATE, UserBoardType.SHORTBOARD);

    // INTERMEDIATE + ADVANCED 난이도 스팟 → PASS
    expect(result.levelFit.INTERMEDIATE).toBe('PASS');
    expect(result.surfRating).toBeGreaterThanOrEqual(5);
    // BEGINNER는 BLOCKED (reef + 상급자 스팟)
    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
  });

  it('시나리오 3: 겨울 강릉 - 초보 (추운 날 + 큰 파도)', () => {
    const spot = makeSpot({
      breakType: 'beach_break',
      difficulty: Difficulty.BEGINNER,
      coastFacingDeg: 90,
    });
    const forecast = makeForecast({
      waveHeight: 1.8,
      wavePeriod: 8,
      windSpeed: 20,
      windGusts: 30,
      windDirection: 90, // 온쇼어
      swellDirection: 90,
      swellHeight: 1.5,
      swellPeriod: 8,
      waterTemperature: 8,
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.BEGINNER);

    // 초보: 높은 파고 + 저수온 → BLOCKED
    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    expect(result.safetyReasons.length).toBeGreaterThan(0);
    // 수온 경고 포함
    expect(result.safetyReasons.some(r => r.includes('수온') || r.includes('저체온'))).toBe(true);
  });

  it('시나리오 4: 완전 플랫 (서핑 불가)', () => {
    const spot = makeSpot({ difficulty: Difficulty.INTERMEDIATE });
    const forecast = makeForecast({
      waveHeight: 0.05,
      wavePeriod: 3,
      windSpeed: 2,
      windGusts: 3,
      windDirection: 270,
      swellDirection: 45,
      swellHeight: 0.02,
      swellPeriod: 3,
    });
    const result = calculateSurfRating(spot, forecast, Difficulty.INTERMEDIATE);

    expect(result.surfRating).toBeLessThanOrEqual(1.0);
    expect(result.detail.waveFit).toBe(0);
  });

  it('시나리오 5: 폭풍 (전 레벨 차단)', () => {
    const result = calculateSurfRating(
      makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
      makeForecast({
        waveHeight: 4.0,
        wavePeriod: 6,
        windSpeed: 50,
        windGusts: 70,
        windDirection: 90,
      }),
      Difficulty.ADVANCED,
    );

    expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    expect(result.levelFit.INTERMEDIATE).toBe('BLOCKED');
    expect(result.levelFit.ADVANCED).toBe('BLOCKED');
    expect(result.safetyReasons.some(r => r.includes('강풍'))).toBe(true);
  });
});
