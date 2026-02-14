/**
 * @file surf-rating.util.ts
 * @description 서핑 적합도(Surf Rating) 계산 유틸리티 v1.3
 *
 * 계산 흐름:
 *   STEP 1: 하드블록 안전 필터 (위험 조건 먼저 차단)
 *   STEP 2: 5개 항목 fit 점수 계산 (각 0~10점)
 *   STEP 3: 가중 합산 → surfRating (0~10)
 *   STEP 4: 레벨별 적합도 + 추천 메시지 반환
 *
 * 핵심 원칙:
 *   - 스팟 특성(breakType, difficulty, coastFacingDeg)에 따라 최적 구간이 다름
 *   - 하드블록은 점수 계산보다 먼저 실행 (안전 우선)
 *   - 풍향 데이터는 "from" 방향 → "to" 방향으로 변환 후 사용
 *   - gust(돌풍)를 effectiveWind에 반영
 */

import { Difficulty } from '../../../common/enums/difficulty.enum';

// =============================================================
// 타입 정의
// =============================================================

/** 스팟 정보 (계산에 필요한 필드만 추출) */
export interface SpotForRating {
  breakType: string | null;
  difficulty: Difficulty;
  coastFacingDeg: number | null;
  bestSwellDirection: string | null;
  bestSwellSpreadDeg: number | null;
  /** [override] 스팟 고유 최적 파고 하한 - null이면 템플릿 사용 */
  optimalWaveMin: number | null;
  /** [override] 스팟 고유 최적 파고 상한 */
  optimalWaveMax: number | null;
  /** [override] 스팟 고유 허용 파고 하한 */
  tolerableWaveMin: number | null;
  /** [override] 스팟 고유 허용 파고 상한 */
  tolerableWaveMax: number | null;
}

/** 예보 데이터 (계산에 필요한 필드만 추출) */
export interface ForecastForRating {
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  swellDirection: number | null;
  /**
   * 풍속 (km/h)
   * Open-Meteo API에서 수신하는 값
   */
  windSpeed: number | null;
  /**
   * 돌풍 (km/h)
   * effectiveWind = max(windSpeed, windGusts × 0.7) 로 계산에 사용
   */
  windGusts: number | null;
  /**
   * 풍향 (0~360도, "FROM" 방향)
   * ⚠️ 기상 데이터의 풍향은 "바람이 불어오는 방향(from)"으로 정의됨
   * 예: windDirection=90° → "동쪽에서 불어오는 바람" (동→서로 이동)
   * 오프쇼어/온쇼어 계산 시 반드시 to 방향으로 변환해야 함
   */
  windDirection: number | null;
}

/** 하드블록 결과: PASS(통과), WARNING(주의), BLOCKED(차단) */
export type LevelFitStatus = 'PASS' | 'WARNING' | 'BLOCKED';

/** 각 레벨별 적합도 결과 */
export interface LevelFitResult {
  BEGINNER: LevelFitStatus;
  INTERMEDIATE: LevelFitStatus;
  ADVANCED: LevelFitStatus;
}

/** 5개 항목별 상세 점수 (디버깅/튜닝/CS 용도) */
export interface RatingDetail {
  /** 파고 적합도 (0~10) - 스팟 특성별 최적 구간 기반 */
  waveFit: number;
  /** 파주기 적합도 (0~10) - 길수록 깨끗한 ground swell */
  periodFit: number;
  /** 풍속 적합도 (0~10) - 약할수록 좋음, gust 반영 */
  windSpeedFit: number;
  /** 스웰 방향 매칭 (0~10) - bestSwellDirection과의 각도차 */
  swellFit: number;
  /** 풍향 적합도 (0~10) - 오프쇼어=최고, 온쇼어=최악 */
  windDirFit: number;
}

/** 최종 계산 결과 */
export interface SurfRatingResult {
  /** 종합 점수 (0.0 ~ 10.0) */
  surfRating: number;
  /** 레벨별 적합도 (PASS/WARNING/BLOCKED) */
  levelFit: LevelFitResult;
  /** 5개 항목 상세 점수 */
  detail: RatingDetail;
  /** 한국어 추천 메시지 */
  recommendationKo: string;
  /**
   * 안전 경고 사유 목록 (빈 배열이면 문제 없음)
   * 하드블록 조건이 여러 개 해당될 수 있으므로 배열로 축적
   * 예: ["리프 브레이크 - 초보자 서핑 금지", "파도가 높아 초보자에게 위험합니다"]
   */
  safetyReasons: string[];
}

// =============================================================
// 방향 문자열 → 각도 변환 맵
// =============================================================

/**
 * 방향 약어를 각도(0~360)로 변환하는 매핑 테이블
 * N=0°, NE=45°, E=90°, SE=135°, S=180°, SW=225°, W=270°, NW=315°
 */
const DIRECTION_TO_DEG: Record<string, number> = {
  N: 0, NNE: 22, NE: 45, ENE: 67,
  E: 90, ESE: 112, SE: 135, SSE: 157,
  S: 180, SSW: 202, SW: 225, WSW: 247,
  W: 270, WNW: 292, NW: 315, NNW: 337,
};

// =============================================================
// 파고 최적/허용 구간 템플릿
// breakType + difficulty 조합별 기본값
// 스팟에 override 값이 있으면 그 값을 우선 사용
// =============================================================

interface WaveRange {
  /** 최적 파고 구간 [min, max] (m) */
  optimal: [number, number];
  /** 허용 파고 구간 [min, max] (m) - 이 밖이면 0점 */
  tolerable: [number, number];
}

/**
 * breakType별, difficulty별 파고 최적/허용 구간 템플릿
 *
 * - beach_break: 모래바닥, 비교적 관대한 파고 범위
 * - reef_break: 리프, 최소 파고가 높아야 파도가 "열림"
 * - point_break: 곶 지형, reef와 유사하되 약간 다름
 * - beach_reef_break: 혼합형, beach와 reef의 중간
 */
const WAVE_TEMPLATES: Record<string, Record<string, WaveRange>> = {
  beach_break: {
    BEGINNER:     { optimal: [0.5, 1.0], tolerable: [0.3, 1.2] },
    INTERMEDIATE: { optimal: [0.8, 1.5], tolerable: [0.5, 2.0] },
    ADVANCED:     { optimal: [1.0, 2.0], tolerable: [0.5, 2.5] },
    EXPERT:       { optimal: [1.5, 2.5], tolerable: [0.8, 3.5] },
  },
  reef_break: {
    BEGINNER:     { optimal: [0.5, 0.8], tolerable: [0.3, 1.0] },
    INTERMEDIATE: { optimal: [1.0, 2.0], tolerable: [0.8, 2.5] },
    ADVANCED:     { optimal: [1.5, 2.5], tolerable: [1.0, 3.5] },
    EXPERT:       { optimal: [2.0, 3.5], tolerable: [1.5, 5.0] },
  },
  point_break: {
    BEGINNER:     { optimal: [0.5, 0.8], tolerable: [0.3, 1.0] },
    INTERMEDIATE: { optimal: [1.0, 1.8], tolerable: [0.8, 2.5] },
    ADVANCED:     { optimal: [1.5, 2.5], tolerable: [1.0, 3.5] },
    EXPERT:       { optimal: [2.0, 3.5], tolerable: [1.5, 5.0] },
  },
  beach_reef_break: {
    BEGINNER:     { optimal: [0.5, 0.9], tolerable: [0.3, 1.1] },
    INTERMEDIATE: { optimal: [0.9, 1.8], tolerable: [0.6, 2.3] },
    ADVANCED:     { optimal: [1.2, 2.2], tolerable: [0.8, 3.0] },
    EXPERT:       { optimal: [1.8, 3.0], tolerable: [1.2, 4.0] },
  },
};

// =============================================================
// 가중치 상수
// =============================================================

/** 각 항목의 가중치 (합계 = 1.0) */
const WEIGHTS = {
  wave: 0.25,      // 파고 - 서핑 가능 여부의 핵심
  period: 0.15,    // 파주기 - ground swell vs wind swell
  windSpeed: 0.20, // 풍속 - 파도면 퀄리티
  swell: 0.25,     // 스웰 매칭 - 방향 안 맞으면 파도 자체가 안 들어옴
  windDir: 0.15,   // 풍향 - 오프쇼어/온쇼어
};

// =============================================================
// 헬퍼 함수
// =============================================================

/**
 * 두 각도 사이의 최소 차이 계산 (원형 보정)
 * 0~360도 범위에서 항상 0~180 사이 값을 반환
 * 예: angularDiff(10, 350) → 20 (360을 넘어가는 경우 보정)
 */
function angularDiff(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * 방향 문자열(N, NE, E 등)을 각도(0~359)로 변환
 * 매핑에 없는 값이면 null 반환
 */
function directionToDeg(dir: string | null): number | null {
  if (!dir) return null;
  return DIRECTION_TO_DEG[dir.toUpperCase()] ?? null;
}

/**
 * 0~10 범위로 클램핑 (소수점 1자리)
 */
function clamp010(value: number): number {
  return Math.round(Math.max(0, Math.min(10, value)) * 10) / 10;
}

// =============================================================
// STEP 1: 하드블록 안전 필터
// =============================================================

/**
 * 하드블록 검사 - 위험한 조건을 점수 계산 전에 먼저 차단
 *
 * 룰 (우선순위 순):
 *   ① reef/point_break + BEGINNER → BLOCKED
 *   ② spot.difficulty ≥ ADVANCED + BEGINNER → BLOCKED
 *   ③ spot.difficulty = EXPERT + INTERMEDIATE → BLOCKED
 *   ④ wave_height > 1.2m + BEGINNER → BLOCKED
 *   ⑤ wave_height > 2.5m + INTERMEDIATE → WARNING
 *   ⑥ wind_speed > 35km/h → BLOCKED (전 레벨)
 *
 * @returns 레벨별 적합도 + 안전 메시지
 */
function checkHardBlock(
  spot: SpotForRating,
  forecast: ForecastForRating,
): { levelFit: LevelFitResult; safetyReasons: string[] } {
  /** 각 레벨의 상태를 PASS로 초기화 */
  const levelFit: LevelFitResult = {
    BEGINNER: 'PASS',
    INTERMEDIATE: 'PASS',
    ADVANCED: 'PASS',
  };
  /** 안전 사유를 배열로 축적 (여러 조건이 동시에 해당될 수 있음) */
  const safetyReasons: string[] = [];

  const breakType = spot.breakType || 'beach_break';
  const waveHeight = Number(forecast.waveHeight);
  const windSpeed = Number(forecast.windSpeed ?? 0);
  const windGusts = Number(forecast.windGusts ?? 0);
  /** gust 반영 유효 풍속: 돌풍이 심하면 풍속보다 체감이 더 나쁨 */
  const effectiveWind = Math.max(windSpeed, windGusts * 0.7);

  // ⑥ 강풍 차단 (전 레벨) - effectiveWind 기준
  if (effectiveWind > 35) {
    levelFit.BEGINNER = 'BLOCKED';
    levelFit.INTERMEDIATE = 'BLOCKED';
    levelFit.ADVANCED = 'BLOCKED';
    safetyReasons.push('강풍으로 서핑이 위험합니다');
    return { levelFit, safetyReasons };
  }

  // ① reef/point_break + BEGINNER → BLOCKED
  if (['reef_break', 'point_break'].includes(breakType)) {
    levelFit.BEGINNER = 'BLOCKED';
    safetyReasons.push('리프/포인트 브레이크 - 초보자 서핑 금지');
  }

  // ② spot.difficulty ≥ ADVANCED + BEGINNER → BLOCKED
  if ([Difficulty.ADVANCED, Difficulty.EXPERT].includes(spot.difficulty)) {
    levelFit.BEGINNER = 'BLOCKED';
    safetyReasons.push('상급자 전용 스팟입니다');
  }

  // ③ spot.difficulty = EXPERT + INTERMEDIATE → BLOCKED
  if (spot.difficulty === Difficulty.EXPERT) {
    levelFit.INTERMEDIATE = 'BLOCKED';
    safetyReasons.push('전문가 전용 스팟입니다');
  }

  // ④ 파고 > 1.2m + BEGINNER → BLOCKED
  if (waveHeight > 1.2 && levelFit.BEGINNER !== 'BLOCKED') {
    levelFit.BEGINNER = 'BLOCKED';
    safetyReasons.push('파도가 높아 초보자에게 위험합니다');
  }

  // ⑤ 파고 > 2.5m + INTERMEDIATE → WARNING
  if (waveHeight > 2.5 && levelFit.INTERMEDIATE !== 'BLOCKED') {
    levelFit.INTERMEDIATE = 'WARNING';
    safetyReasons.push('파도가 높습니다. 주의하세요');
  }

  return { levelFit, safetyReasons };
}

// =============================================================
// STEP 2: 5개 항목 fit 점수 계산
// =============================================================

/**
 * ① 파고 점수 (waveFit) - 가중치 25%
 *
 * 스팟의 breakType + difficulty에 따라 최적/허용 구간이 달라짐
 * 스팟에 override 값(optimalWaveMin 등)이 있으면 우선 사용
 *
 * 공식: waveFit = max(0, 10 × (1 - |현재파고 - 목표중심| / 목표범위))
 */
function calcWaveFit(spot: SpotForRating, forecast: ForecastForRating): number {
  const waveHeight = Number(forecast.waveHeight);
  const breakType = spot.breakType || 'beach_break';
  const difficulty = spot.difficulty;

  /**
   * 파고 구간 결정: 스팟 override → 템플릿 (부분 override 허용)
   *
   * 4개 값(optimalMin/Max, tolerableMin/Max)을 개별적으로 확인:
   * - 스팟에 값이 있으면 그 값 사용 (override)
   * - 없으면(null) breakType+difficulty 템플릿의 해당 값 사용
   * → 예: optimalMin만 override하고 나머지는 템플릿 값 유지 가능
   */
  const template = WAVE_TEMPLATES[breakType]?.[difficulty]
    || WAVE_TEMPLATES.beach_break.INTERMEDIATE; // 매칭 실패 시 기본값

  const optimal: [number, number] = [
    spot.optimalWaveMin != null ? Number(spot.optimalWaveMin) : template.optimal[0],
    spot.optimalWaveMax != null ? Number(spot.optimalWaveMax) : template.optimal[1],
  ];
  const tolerable: [number, number] = [
    spot.tolerableWaveMin != null ? Number(spot.tolerableWaveMin) : template.tolerable[0],
    spot.tolerableWaveMax != null ? Number(spot.tolerableWaveMax) : template.tolerable[1],
  ];

  /** 목표 중심: 최적 구간의 중앙값 */
  const center = (optimal[0] + optimal[1]) / 2;
  /** 목표 범위: 허용 구간의 절반 폭 */
  const range = (tolerable[1] - tolerable[0]) / 2;

  if (range <= 0) return 0;

  const distance = Math.abs(waveHeight - center);
  return clamp010(10 * (1 - distance / range));
}

/**
 * ② 파주기 점수 (periodFit) - 가중치 15%
 *
 * 주기가 길수록 ground swell = 깨끗하고 파워 있는 파도
 * 6초 이하는 wind swell로 거의 서핑 불가
 * 구간형으로 현실적 점수 부여
 */
function calcPeriodFit(forecast: ForecastForRating): number {
  const period = Number(forecast.wavePeriod);

  if (period >= 14) return 10;   // 최상급 ground swell
  if (period >= 12) return 9;    // 매우 좋은 ground swell
  if (period >= 10) return 8;    // 좋음, ground swell 진입
  if (period >= 8)  return 7;    // 괜찮음, 탈만함
  if (period >= 7)  return 5;    // 보통
  if (period >= 6)  return 3;    // 겨우 탈 수 있음
  if (period >= 5)  return 1;    // 나쁨, wind swell
  return 0;                      // 서핑 불가 수준
}

/**
 * ③ 풍속 점수 (windSpeedFit) - 가중치 20%
 *
 * 바람이 약할수록 파도면이 깨끗함
 * ⚠️ gust(돌풍) 반영: effectiveWind = max(windSpeed, windGusts × 0.7)
 * wind_speed만 보면 "괜찮다"로 나오는데 gust 때문에 실제론 엉망인 날 대응
 */
function calcWindSpeedFit(forecast: ForecastForRating): number {
  const windSpeed = Number(forecast.windSpeed ?? 0);
  const windGusts = Number(forecast.windGusts ?? 0);

  /**
   * 유효 풍속 계산
   * gust × 0.7을 사용하는 이유: gust는 순간값이라 체감의 70% 정도로 반영
   * 예) wind=12, gust=25 → effectiveWind = max(12, 17.5) = 17.5
   */
  const effectiveWind = Math.max(windSpeed, windGusts * 0.7);

  if (effectiveWind < 5)  return 10;  // 글래시 컨디션 (거울 같은 수면)
  if (effectiveWind < 10) return 8;   // 약한 바람, 좋음
  if (effectiveWind < 15) return 6;   // 보통, 파도면 약간 흐트러짐
  if (effectiveWind < 20) return 4;   // 지저분해짐
  if (effectiveWind < 25) return 2;   // 꽤 거칠어짐
  if (effectiveWind < 35) return 1;   // 나쁨
  return 0;                           // 서핑 위험 (하드블록에서도 차단됨)
}

/**
 * ④ 스웰 매칭 점수 (swellFit) - 가중치 25%
 *
 * 현재 스웰 방향과 스팟의 최적 스웰 방향(bestSwellDirection)의 각도차로 계산
 * spread(허용 범위) 안에 들어올수록 높은 점수
 *
 * 공식: swellFit = max(0, 10 × (1 - delta / spread))
 * - delta: 현재 스웰 방향과 최적 방향의 각도차 (원형 보정)
 * - spread: 스팟별 허용 범위 (beach=45°, reef=30°, point=25°)
 */
function calcSwellFit(spot: SpotForRating, forecast: ForecastForRating): number {
  /** 현재 스웰 방향 (API에서 수신, 0~360도) */
  const currentSwellDeg = Number(forecast.swellDirection);
  if (isNaN(currentSwellDeg) || forecast.swellDirection == null) return 5; // 데이터 없으면 중간값

  /** 스팟의 최적 스웰 방향을 각도로 변환 (예: "SW" → 225°) */
  const bestDeg = directionToDeg(spot.bestSwellDirection);
  if (bestDeg == null) return 5; // 데이터 없으면 중간값

  /** 스웰 허용 범위 (스팟에 값이 없으면 breakType 기본값 사용) */
  const spread = spot.bestSwellSpreadDeg
    || getDefaultSpread(spot.breakType);

  /** 각도차 계산 (원형 보정: 10°와 350°의 차이 = 20°) */
  const delta = angularDiff(currentSwellDeg, bestDeg);

  return clamp010(10 * (1 - delta / spread));
}

/**
 * ⑤ 풍향 점수 (windDirFit) - 가중치 15%
 *
 * 오프쇼어(육지→바다) = 파도면 깨끗 = 최고
 * 온쇼어(바다→육지) = 파도면 엉망 = 최악
 *
 * ⚠️ 핵심 보정: 기상 데이터 풍향은 "FROM" 방향
 *   windDirection=90° → "동쪽에서 불어오는 바람" (동→서 이동)
 *   반드시 "TO" 방향으로 변환 후 비교해야 함
 *   wind_to_deg = (windDirection + 180) % 360
 *
 * 오프쇼어 판별:
 *   바람이 바다 쪽으로 향하면(wind_to_deg ≈ coastFacingDeg) → 오프쇼어
 *   바람이 육지 쪽으로 향하면(wind_to_deg ≈ coastFacingDeg 반대) → 온쇼어
 */
function calcWindDirFit(spot: SpotForRating, forecast: ForecastForRating): number {
  const windFromDeg = Number(forecast.windDirection);
  if (isNaN(windFromDeg) || forecast.windDirection == null) return 5; // 데이터 없으면 중간값

  const coastFacing = spot.coastFacingDeg;
  if (coastFacing == null) return 5; // 데이터 없으면 중간값

  /**
   * FROM → TO 변환 (가장 중요한 보정)
   * 이 변환 없이 비교하면 오프쇼어/온쇼어가 완전히 뒤집힘
   */
  const windToDeg = (windFromDeg + 180) % 360;

  /**
   * 바람이 향하는 방향(windToDeg)과 해안이 바라보는 방향(coastFacing)의 차이
   * - 차이 작음 → 바람이 바다 쪽으로 향함 → 오프쇼어
   * - 차이 큼(~180°) → 바람이 육지 쪽으로 향함 → 온쇼어
   */
  const delta = angularDiff(windToDeg, coastFacing);

  // 구간형 점수 (30° 단위, ±15° 오차에도 구간 안 바뀜)
  if (delta < 30)  return 10;  // 오프쇼어 - 파도면 깨끗
  if (delta < 60)  return 8;   // 사이드오프
  if (delta < 90)  return 5;   // 크로스쇼어
  if (delta < 120) return 3;   // 사이드온
  return 1;                    // 온쇼어 - 파도면 엉망
}

/**
 * breakType별 기본 스웰 허용 범위 반환
 * bestSwellSpreadDeg가 null일 때 사용하는 폴백
 */
function getDefaultSpread(breakType: string | null): number {
  switch (breakType) {
    case 'reef_break':       return 30;
    case 'point_break':      return 25;
    case 'beach_reef_break': return 35;
    case 'beach_break':
    default:                 return 45;
  }
}

// =============================================================
// STEP 3~4: 가중 합산 + 추천 메시지
// =============================================================

/**
 * 점수(0~10)에 따른 한국어 추천 메시지 반환
 * levelFit 상태에 따라 안전 메시지를 우선 표시
 */
function getRecommendationKo(
  rating: number,
  userLevelFit: LevelFitStatus,
  safetyReasons: string[],
): string {
  // BLOCKED: 안전 사유를 우선 표시 (여러 사유면 '; '로 연결)
  if (userLevelFit === 'BLOCKED') {
    return safetyReasons.length > 0
      ? safetyReasons.join('; ')
      : '이 스팟은 현재 레벨에서 서핑할 수 없습니다';
  }

  // 점수 기반 메시지 생성
  let message: string;
  if (rating >= 9)      message = '완벽한 서핑 컨디션이에요!';
  else if (rating >= 7) message = '서핑하기 좋은 날이에요!';
  else if (rating >= 5) message = '무난한 컨디션이에요';
  else if (rating >= 3) message = '컨디션이 아쉬워요';
  else                  message = '오늘은 쉬는 게 좋겠어요';

  // WARNING: 점수 메시지 + 주의 추가
  if (userLevelFit === 'WARNING') {
    message += ' 단, 주의가 필요합니다.';
  }

  return message;
}

/**
 * 간단한 컨디션 요약 (프론트엔드 표시용)
 * 파도/바람/전체 상태를 한국어로 표현
 */
function getSimpleCondition(forecast: ForecastForRating): {
  waveStatus: string;
  windStatus: string;
  overall: string;
} {
  const wh = Number(forecast.waveHeight);
  const windSpeed = Number(forecast.windSpeed ?? 0);
  const windGusts = Number(forecast.windGusts ?? 0);
  const effectiveWind = Math.max(windSpeed, windGusts * 0.7);

  // 파도 상태
  let waveStatus: string;
  if (wh < 0.5)      waveStatus = '잔잔';
  else if (wh <= 1.5) waveStatus = '적당';
  else if (wh <= 2.5) waveStatus = '높음';
  else                waveStatus = '위험';

  // 바람 상태 (effectiveWind 기준)
  let windStatus: string;
  if (effectiveWind < 10)      windStatus = '약함';
  else if (effectiveWind <= 20) windStatus = '보통';
  else if (effectiveWind <= 30) windStatus = '강함';
  else                          windStatus = '매우 강함';

  // 전체 상태
  let overall: string;
  if (wh >= 0.5 && wh <= 1.5 && effectiveWind < 20)  overall = '좋음';
  else if (wh > 2.5 || effectiveWind > 30)            overall = '주의';
  else                                                 overall = '보통';

  return { waveStatus, windStatus, overall };
}

// =============================================================
// 메인 함수: 서핑 적합도 종합 계산
// =============================================================

/**
 * 서핑 적합도 종합 계산 (v1.3)
 *
 * @param spot - 스팟 고정 속성 (breakType, difficulty, coastFacingDeg 등)
 * @param forecast - 현재 시각 예보 데이터 (파고, 풍속, 스웰 방향 등)
 * @param userLevel - 사용자 서핑 레벨 (기본: INTERMEDIATE)
 * @returns 종합 점수 + 레벨 적합도 + 상세 점수 + 추천 메시지
 */
export function calculateSurfRating(
  spot: SpotForRating,
  forecast: ForecastForRating,
  userLevel: Difficulty = Difficulty.INTERMEDIATE,
): SurfRatingResult {
  // ----- STEP 1: 하드블록 안전 필터 -----
  const { levelFit, safetyReasons } = checkHardBlock(spot, forecast);

  // ----- STEP 2: 5개 항목 fit 점수 계산 (하드블록과 무관하게 항상 계산) -----
  const detail: RatingDetail = {
    waveFit: calcWaveFit(spot, forecast),
    periodFit: calcPeriodFit(forecast),
    windSpeedFit: calcWindSpeedFit(forecast),
    swellFit: calcSwellFit(spot, forecast),
    windDirFit: calcWindDirFit(spot, forecast),
  };

  // ----- STEP 3: 가중 합산 → surfRating (0~10) -----
  const totalScore =
    detail.waveFit     * WEIGHTS.wave +
    detail.periodFit   * WEIGHTS.period +
    detail.windSpeedFit * WEIGHTS.windSpeed +
    detail.swellFit    * WEIGHTS.swell +
    detail.windDirFit  * WEIGHTS.windDir;

  const surfRating = clamp010(totalScore);

  // ----- STEP 4: 추천 메시지 생성 -----
  // 사용자 레벨에 해당하는 levelFit 상태로 메시지 결정
  const userLevelKey = userLevel as keyof LevelFitResult;
  const userLevelFit = levelFit[userLevelKey] || 'PASS';

  const recommendationKo = getRecommendationKo(surfRating, userLevelFit, safetyReasons);

  return {
    surfRating,
    levelFit,
    detail,
    recommendationKo,
    safetyReasons,
  };
}

/**
 * 간단한 컨디션 요약 내보내기 (대시보드용)
 */
export { getSimpleCondition };
