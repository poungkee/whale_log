/**
 * @file edge-case-audit.spec.ts
 * @description 빈 구간 + 경계값 + 보드×레벨 조합 정밀 감사 테스트
 *
 * 이전 verification.spec.ts에서 커버하지 못한 영역:
 * 1. hints 빈 구간 증명 (숏보드 0.8~1.0m, 미드렝스 1.8~2.5m 등)
 * 2. 하드블록 정확한 경계값 (=35, =1.2, =2.5, =10°C, =14°C)
 * 3. 보드(4종) × 레벨(4종) × breakType(4종) 매트릭스
 * 4. 파고 0.3~0.5m waveFit≤3 태그 누락 증명
 */
import {
  calculateSurfRating,
  getSimpleCondition,
  SpotForRating,
  ForecastForRating,
} from './surf-rating.util';
import { generateHints, type HintsInput } from './hints.util';
import { Difficulty } from '../../../common/enums/difficulty.enum';
import { UserBoardType } from '../../../common/enums/user-board-type.enum';

// =============================================================
// 팩토리
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

/** hints 생성 헬퍼 */
function makeHints(
  detail: HintsInput['detail'],
  overrides: Partial<Omit<HintsInput, 'detail'>> = {},
): ReturnType<typeof generateHints> {
  return generateHints({
    detail,
    surfRating: overrides.surfRating ?? 5,
    safetyReasons: overrides.safetyReasons ?? [],
    boardType: overrides.boardType ?? UserBoardType.UNSET,
    waveHeight: overrides.waveHeight ?? 1.0,
    windSpeed: overrides.windSpeed ?? 10,
    wavePeriod: overrides.wavePeriod ?? 8,
  });
}

// =============================================================
// 1. hints 빈 구간 증명
// =============================================================

describe('1. hints 빈 구간 증명', () => {

  describe('1-1. 숏보드 0.8~1.0m 구간 (수정 완료)', () => {
    it('숏보드 + 파고 0.9m → SHORTBOARD_TIP 붙음 (갭 수정됨)', () => {
      const hints = makeHints(
        { waveFit: 7, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.SHORTBOARD, waveHeight: 0.9, surfRating: 5 },
      );
      // 수정 후: 0.8~1.0m 구간에 "탈 수 있지만 파도가 좀 약해요" 메시지 추가
      expect(hints.tags).toContain('SHORTBOARD_TIP');
      expect(hints.message).toContain('좀 약해요');
    });

    it('숏보드 + 파고 0.79m → SHORTBOARD_TIP 있음 (빈 구간 직전)', () => {
      const hints = makeHints(
        { waveFit: 5, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.SHORTBOARD, waveHeight: 0.79, surfRating: 4 },
      );
      expect(hints.tags).toContain('SHORTBOARD_TIP');
    });

    it('숏보드 + 파고 1.0m + surfRating≥5 → SHORTBOARD_TIP 있음 (빈 구간 직후)', () => {
      const hints = makeHints(
        { waveFit: 8, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.SHORTBOARD, waveHeight: 1.0, surfRating: 5 },
      );
      expect(hints.tags).toContain('SHORTBOARD_TIP');
    });
  });

  describe('1-2. 미드렝스 1.8~2.5m 구간 (수정 완료)', () => {
    it('미드렝스 + 파고 2.0m → MIDLENGTH_TIP 붙음 (갭 수정됨)', () => {
      const hints = makeHints(
        { waveFit: 5, periodFit: 5, windSpeedFit: 5, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.MIDLENGTH, waveHeight: 2.0, surfRating: 5 },
      );
      expect(hints.tags).toContain('MIDLENGTH_TIP');
      expect(hints.message).toContain('파도가 좀 커요');
    });

    it('미드렝스 + 파고 1.8m + surfRating≥5 → MIDLENGTH_TIP 있음', () => {
      const hints = makeHints(
        { waveFit: 8, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.MIDLENGTH, waveHeight: 1.8, surfRating: 5 },
      );
      expect(hints.tags).toContain('MIDLENGTH_TIP');
    });

    it('미드렝스 + 파고 2.51m → MIDLENGTH_TIP 있음 (>2.5 분기)', () => {
      const hints = makeHints(
        { waveFit: 2, periodFit: 5, windSpeedFit: 5, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.MIDLENGTH, waveHeight: 2.51, surfRating: 3 },
      );
      expect(hints.tags).toContain('MIDLENGTH_TIP');
    });
  });

  describe('1-3. 파고 0.3~0.5m + waveFit≤3 태그 (수정 완료)', () => {
    it('파고 0.35m + waveFit=2 → WAVE_TOO_SMALL 붙음 (갭 수정됨)', () => {
      const hints = makeHints(
        { waveFit: 2, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.UNSET, waveHeight: 0.35, surfRating: 3 },
      );
      // 수정 후: 0.3~0.5m 구간에 WAVE_TOO_SMALL + "파도가 많이 잔잔해요" 메시지
      expect(hints.tags).toContain('WAVE_TOO_SMALL');
      expect(hints.message).toContain('잔잔해요');
    });

    it('파고 0.29m + waveFit=1 → WAVE_TOO_SMALL 정상 작동', () => {
      const hints = makeHints(
        { waveFit: 1, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.UNSET, waveHeight: 0.29, surfRating: 2 },
      );
      expect(hints.tags).toContain('WAVE_TOO_SMALL');
    });
  });

  describe('1-4. 롱보드 추천 문구 (수정 완료)', () => {
    it('롱보드 + 파고 1.8m → "미드렝스나 숏보드를 추천" (미드렝스 포함)', () => {
      const hints = makeHints(
        { waveFit: 5, periodFit: 5, windSpeedFit: 8, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.LONGBOARD, waveHeight: 1.8, surfRating: 5 },
      );
      // 수정 후: "롱보드에는 파도가 높아요. 미드렝스나 숏보드를 추천해요."
      expect(hints.message).toContain('미드렝스');
      expect(hints.tags).toContain('LONGBOARD_TIP');
    });
  });

  describe('1-5. 숏보드 surfRating<5 구간 (수정 완료)', () => {
    it('숏보드 + 파고 1.5m + surfRating=4 → SHORTBOARD_TIP 붙음 (갭 수정됨)', () => {
      const hints = makeHints(
        { waveFit: 6, periodFit: 5, windSpeedFit: 5, swellFit: 5, windDirFit: 5 },
        { boardType: UserBoardType.SHORTBOARD, waveHeight: 1.5, surfRating: 4 },
      );
      // 수정 후: surfRating<5에도 "컨디션을 확인하세요" 메시지 제공
      expect(hints.tags).toContain('SHORTBOARD_TIP');
      expect(hints.message).toContain('컨디션을 확인하세요');
    });
  });
});

// =============================================================
// 2. 하드블록 정확한 경계값 테스트
// =============================================================

describe('2. 하드블록 정확한 경계값', () => {

  describe('2-1. effectiveWind 경계', () => {
    it('effectiveWind = 정확히 35 → PASS (>35 조건이므로)', () => {
      // windSpeed=35, gust=0 → effectiveWind = max(35, 0) = 35
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ waveHeight: 1.0, windSpeed: 35, windGusts: 0 }),
        Difficulty.INTERMEDIATE,
      );
      // >35 조건이므로 35는 차단 안 됨
      expect(result.levelFit.ADVANCED).not.toBe('BLOCKED');
    });

    it('effectiveWind = 35.1 → 전 레벨 BLOCKED', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ waveHeight: 1.0, windSpeed: 35.1, windGusts: 0 }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.levelFit.ADVANCED).toBe('BLOCKED');
    });

    it('effectiveWind = 35 → windSpeedFit = 0 (하드블록은 아니지만 점수 0)', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ waveHeight: 1.0, windSpeed: 35, windGusts: 0 }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.detail.windSpeedFit).toBe(0);
    });
  });

  describe('2-2. waveHeight 경계', () => {
    it('waveHeight = 정확히 1.2 → BEGINNER PASS (>1.2 조건)', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 1.2 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).not.toBe('BLOCKED');
    });

    it('waveHeight = 1.21 → BEGINNER BLOCKED 또는 WARNING (grace zone 1.2~1.4)', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 1.21 }),
        Difficulty.BEGINNER,
      );
      // 1.21m은 하드블록(>1.2) 대상이지만
      // grace zone(1.2~1.4m + beach_break + 나머지 fit 평균 ≥ 7.0) 조건 충족 시 WARNING
      expect(['BLOCKED', 'WARNING']).toContain(result.levelFit.BEGINNER);
    });

    it('waveHeight = 1.21 + reef_break → BEGINNER BLOCKED (grace zone 미적용)', () => {
      const result = calculateSurfRating(
        makeSpot({ breakType: 'reef_break' }),
        makeForecast({ waveHeight: 1.21 }),
        Difficulty.BEGINNER,
      );
      // reef_break는 grace zone 미적용 + reef 자체 하드블록
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    });

    it('waveHeight = 1.41 → BEGINNER BLOCKED (grace zone 초과)', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 1.41 }),
        Difficulty.BEGINNER,
      );
      // 1.41m > 1.4 → grace zone 밖 → BLOCKED 유지
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
    });

    it('waveHeight = 정확히 2.5 → INTERMEDIATE PASS (>2.5 조건)', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ waveHeight: 2.5 }),
        Difficulty.INTERMEDIATE,
      );
      // >2.5 조건이므로 2.5는 WARNING 안 걸림
      expect(result.levelFit.INTERMEDIATE).not.toBe('WARNING');
    });

    it('waveHeight = 2.51 → INTERMEDIATE WARNING', () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ waveHeight: 2.51 }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.levelFit.INTERMEDIATE).toBe('WARNING');
    });
  });

  describe('2-3. windGusts 경계', () => {
    it('windGusts = 정확히 35 → BEGINNER WARNING (>=35)', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, windSpeed: 5, windGusts: 35 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('WARNING');
    });

    it('windGusts = 34.9 → BEGINNER 돌풍 WARNING 안 걸림', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, windSpeed: 5, windGusts: 34.9 }),
        Difficulty.BEGINNER,
      );
      // 돌풍 34.9는 >=35 미달 → 돌풍 WARNING 안 걸림
      // (다른 compound risk 등에 의한 WARNING 가능성은 있음)
      expect(result.safetyReasons.every(r => !r.includes('돌풍'))).toBe(true);
    });

    it('windGusts = 정확히 45 → BEGINNER BLOCKED + INTERMEDIATE WARNING', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, windSpeed: 5, windGusts: 45 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.levelFit.INTERMEDIATE).toBe('WARNING');
    });

    it('windGusts = 정확히 50 → INTERMEDIATE BLOCKED', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, windSpeed: 5, windGusts: 50 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.INTERMEDIATE).toBe('BLOCKED');
    });
  });

  describe('2-4. waterTemperature 경계', () => {
    it('waterTemp = 정확히 10 → BEGINNER WARNING (< 14이므로), BLOCKED 아님 (< 10 아님)', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, waterTemperature: 10 }),
        Difficulty.BEGINNER,
      );
      // <10 false → BLOCKED 안 걸림, <14 true → WARNING
      expect(result.levelFit.BEGINNER).toBe('WARNING');
      expect(result.safetyReasons.some(r => r.includes('웻슈트'))).toBe(true);
      expect(result.safetyReasons.every(r => !r.includes('저체온증'))).toBe(true);
    });

    it('waterTemp = 9.9 → BEGINNER BLOCKED (저체온증)', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, waterTemperature: 9.9 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('BLOCKED');
      expect(result.safetyReasons.some(r => r.includes('저체온증'))).toBe(true);
    });

    it('waterTemp = 정확히 14 → BEGINNER 수온 경고 없음', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, waterTemperature: 14 }),
        Difficulty.BEGINNER,
      );
      expect(result.safetyReasons.every(r => !r.includes('수온') && !r.includes('웻슈트'))).toBe(true);
    });

    it('waterTemp = 13.9 → BEGINNER WARNING (웻슈트 필수)', () => {
      const result = calculateSurfRating(
        makeSpot(),
        makeForecast({ waveHeight: 0.6, waterTemperature: 13.9 }),
        Difficulty.BEGINNER,
      );
      expect(result.levelFit.BEGINNER).toBe('WARNING');
      expect(result.safetyReasons.some(r => r.includes('웻슈트'))).toBe(true);
    });
  });
});

// =============================================================
// 3. 보드(4) × 레벨(4) × breakType(4) 매트릭스
// =============================================================

describe('3. 보드 × 레벨 × breakType 매트릭스', () => {

  const boards: UserBoardType[] = [
    UserBoardType.LONGBOARD,
    UserBoardType.MIDLENGTH,
    UserBoardType.SHORTBOARD,
    UserBoardType.UNSET,
  ];
  const levels: Difficulty[] = [
    Difficulty.BEGINNER,
    Difficulty.INTERMEDIATE,
    Difficulty.ADVANCED,
    Difficulty.EXPERT,
  ];
  const breakTypes = ['beach_break', 'reef_break', 'point_break', 'beach_reef_break'];

  // 좋은 조건에서 모든 조합이 에러 없이 결과를 반환하는지 검증
  describe('3-1. 모든 조합(64개)에서 에러 없이 결과 반환', () => {
    for (const board of boards) {
      for (const level of levels) {
        for (const bt of breakTypes) {
          it(`${board} + ${level} + ${bt} → 정상 반환`, () => {
            const spot = makeSpot({
              breakType: bt,
              difficulty: level === Difficulty.EXPERT ? Difficulty.ADVANCED : level,
            });
            const fc = makeForecast({ waveHeight: 1.0 });
            const result = calculateSurfRating(spot, fc, level, board);

            // 기본 구조 검증
            expect(result.surfRating).toBeGreaterThanOrEqual(0);
            expect(result.surfRating).toBeLessThanOrEqual(10);
            expect(result.levelFit).toBeDefined();
            expect(result.detail).toBeDefined();
            expect(result.recommendationKo).toBeDefined();
            expect(typeof result.recommendationKo).toBe('string');
            expect(result.recommendationKo.length).toBeGreaterThan(0);
            expect(result.safetyReasons).toBeDefined();
            expect(Array.isArray(result.safetyReasons)).toBe(true);
          });
        }
      }
    }
  });

  describe('3-2. 보드별 waveFit 순서 검증 (작은 파도)', () => {
    it('파고 0.4m → LONGBOARD > MIDLENGTH > SHORTBOARD waveFit', () => {
      const spot = makeSpot({ difficulty: Difficulty.BEGINNER });
      const fc = makeForecast({ waveHeight: 0.4 });

      const longboard = calculateSurfRating(spot, fc, Difficulty.BEGINNER, UserBoardType.LONGBOARD);
      const midlength = calculateSurfRating(spot, fc, Difficulty.BEGINNER, UserBoardType.MIDLENGTH);
      const shortboard = calculateSurfRating(spot, fc, Difficulty.BEGINNER, UserBoardType.SHORTBOARD);

      expect(longboard.detail.waveFit).toBeGreaterThanOrEqual(midlength.detail.waveFit);
      expect(midlength.detail.waveFit).toBeGreaterThanOrEqual(shortboard.detail.waveFit);
    });
  });

  describe('3-3. 보드별 waveFit 순서 검증 (큰 파도)', () => {
    it('파고 2.0m ADVANCED → SHORTBOARD > MIDLENGTH > LONGBOARD waveFit', () => {
      const spot = makeSpot({ difficulty: Difficulty.ADVANCED });
      const fc = makeForecast({ waveHeight: 2.0 });

      const longboard = calculateSurfRating(spot, fc, Difficulty.ADVANCED, UserBoardType.LONGBOARD);
      const midlength = calculateSurfRating(spot, fc, Difficulty.ADVANCED, UserBoardType.MIDLENGTH);
      const shortboard = calculateSurfRating(spot, fc, Difficulty.ADVANCED, UserBoardType.SHORTBOARD);

      expect(shortboard.detail.waveFit).toBeGreaterThanOrEqual(midlength.detail.waveFit);
      expect(midlength.detail.waveFit).toBeGreaterThanOrEqual(longboard.detail.waveFit);
    });
  });

  describe('3-4. reef/point + BEGINNER → 항상 BLOCKED', () => {
    for (const bt of ['reef_break', 'point_break']) {
      for (const board of boards) {
        it(`${bt} + BEGINNER + ${board} → BLOCKED`, () => {
          const result = calculateSurfRating(
            makeSpot({ breakType: bt, difficulty: Difficulty.BEGINNER }),
            makeForecast({ waveHeight: 0.5 }),
            Difficulty.BEGINNER,
            board,
          );
          expect(result.levelFit.BEGINNER).toBe('BLOCKED');
        });
      }
    }
  });

  describe('3-5. simpleCondition 보드별 overall 검증', () => {
    it('파고 0.35m → 롱보드 "좋음", 숏보드 "보통"', () => {
      const fc = makeForecast({ waveHeight: 0.35, windSpeed: 5, windGusts: 8 });
      const longboard = getSimpleCondition(fc, UserBoardType.LONGBOARD);
      const shortboard = getSimpleCondition(fc, UserBoardType.SHORTBOARD);

      // 롱보드 goodMin=0.3 → 0.35 포함 → "좋음"
      expect(longboard.overall).toBe('좋음');
      // 숏보드 goodMin=0.8 → 0.35 미달 → "보통"
      expect(shortboard.overall).toBe('보통');
    });

    it('파고 2.0m → 숏보드 "좋음", 롱보드 "보통"', () => {
      const fc = makeForecast({ waveHeight: 2.0, windSpeed: 5, windGusts: 8 });
      const longboard = getSimpleCondition(fc, UserBoardType.LONGBOARD);
      const shortboard = getSimpleCondition(fc, UserBoardType.SHORTBOARD);

      // 숏보드 goodMax=2.5 → 2.0 포함 → "좋음"
      expect(shortboard.overall).toBe('좋음');
      // 롱보드 goodMax=1.2 → 2.0 초과 → "보통"
      expect(longboard.overall).toBe('보통');
    });
  });
});

// =============================================================
// 4. periodFit 경계값 정밀 검증
// =============================================================

describe('4. periodFit 경계값', () => {
  const cases: [number, number][] = [
    [4, 0],    // < 5 → 0
    [5, 1],    // >= 5 → 1
    [6, 3],    // >= 6 → 3
    [7, 5],    // >= 7 → 5
    [8, 7],    // >= 8 → 7
    [10, 8],   // >= 10 → 8
    [12, 9],   // >= 12 → 9
    [14, 10],  // >= 14 → 10
  ];

  for (const [period, expectedFit] of cases) {
    it(`wavePeriod = ${period} → periodFit = ${expectedFit}`, () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ waveHeight: 1.0, wavePeriod: period }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.detail.periodFit).toBe(expectedFit);
    });
  }
});

// =============================================================
// 5. windSpeedFit 경계값 정밀 검증
// =============================================================

describe('5. windSpeedFit 경계값 (effectiveWind 기준)', () => {
  // windGusts=0으로 고정하면 effectiveWind = windSpeed
  const cases: [number, number][] = [
    [0, 10],   // < 5 → 10
    [4.9, 10], // < 5 → 10
    [5, 8],    // >= 5, < 10 → 8
    [9.9, 8],
    [10, 6],   // >= 10, < 15 → 6
    [14.9, 6],
    [15, 4],   // >= 15, < 20 → 4
    [19.9, 4],
    [20, 2],   // >= 20, < 25 → 2
    [24.9, 2],
    [25, 1],   // >= 25, < 35 → 1
    [34.9, 1],
    [35, 0],   // >= 35 → 0
  ];

  for (const [windSpeed, expectedFit] of cases) {
    it(`effectiveWind = ${windSpeed} → windSpeedFit = ${expectedFit}`, () => {
      const result = calculateSurfRating(
        makeSpot({ difficulty: Difficulty.INTERMEDIATE }),
        makeForecast({ waveHeight: 1.0, windSpeed, windGusts: 0 }),
        Difficulty.INTERMEDIATE,
      );
      expect(result.detail.windSpeedFit).toBe(expectedFit);
    });
  }
});
