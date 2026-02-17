/**
 * @file surf-rating.util.ts
 * @description 서핑 적합도(Surf Rating) 계산 유틸리티 v1.4.2
 *
 * 계산 흐름:
 *   STEP 1: 하드블록 안전 필터 (위험 조건 먼저 차단)
 *   STEP 2: 5개 항목 fit 점수 계산 (각 0~10점)
 *   STEP 2.5: 약풍 시 풍향 보정 ← v1.4.2 (FN-2)
 *   STEP 3: 가중 합산 → rawSurfRating (0~10)
 *   STEP 3.5: 거짓양성 보정 (복합 위험 감점 + 품질 게이트) ← v1.4.1
 *   STEP 3.7: 거짓음성 보정 (하드블록 grace zone) ← v1.4.2 (FN-1)
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
  /** 스웰 방향 (0~360도) - swellFit 계산에 사용 */
  swellDirection: number | null;
  /** 스웰 높이 (미터) - swellFit 보정에 사용 (v1.4) */
  swellHeight: number | null;
  /** 스웰 주기 (초) - swellFit 보정에 사용 (v1.4) */
  swellPeriod: number | null;
  /** 수온 (°C) - 안전 판정에 사용 (v1.4) */
  waterTemperature: number | null;
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

/**
 * 각 항목의 가중치 (합계 = 1.0)
 *
 * v1.4 조정: swellFit이 이제 방향+높이+주기를 포함하므로
 * periodFit 비중을 약간 줄이고 windDir에 분배
 * → "파고가 왕이다" 철학(A안) 유지하면서 바람 방향 중요도 보강
 */
const WEIGHTS = {
  wave: 0.25,      // 파고 - 서핑 가능 여부의 핵심 (+ multiplier 패널티)
  period: 0.10,    // 파주기 - swellFit에 주기 일부 반영되므로 축소
  windSpeed: 0.20, // 풍속 - 파도면 퀄리티
  swell: 0.25,     // 스웰 매칭 - 방향+높이+주기 종합 (v1.4)
  windDir: 0.20,   // 풍향 - 오프쇼어/온쇼어 (v1.4: period 축소분 흡수)
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
 * 안전 사유의 우선순위 카테고리
 *
 * 사용자에게 "왜 차단/경고인지" 가장 중요한 사유를 먼저 보여주기 위한 정렬 기준
 *   P1 - 생존/사고 위험: 강풍, 극저온, 과대파 (즉시 생명 위협)
 *   P2 - 장비/준비 필수: 웻슈트, 저수온 경고 (대비하면 가능)
 *   P3 - 스팟 제한: 리프 브레이크, 난이도 (스팟 자체 특성)
 *   P4 - 컨디션 주의: 파도 높음, 돌풍 주의 (상황적 경고)
 */
type SafetyPriority = 1 | 2 | 3 | 4;

interface SafetyReason {
  /** 사용자에게 보여줄 한국어 메시지 */
  message: string;
  /** 정렬 우선순위 (1=최우선, 4=참고) */
  priority: SafetyPriority;
}

/**
 * 하드블록 검사 - 위험한 조건을 점수 계산 전에 먼저 차단
 *
 * v1.4 룰:
 *   ① effectiveWind > 35 → 전 레벨 BLOCKED (강풍)
 *   ② gust ≥ 45 + BEGINNER → BLOCKED / gust ≥ 50 + INTERMEDIATE → BLOCKED
 *   ③ gust ≥ 35 + BEGINNER → WARNING / gust ≥ 45 + INTERMEDIATE → WARNING
 *   ④ reef/point_break + BEGINNER → BLOCKED
 *   ⑤ spot.difficulty ≥ ADVANCED + BEGINNER → BLOCKED
 *   ⑥ spot.difficulty = EXPERT + INTERMEDIATE → BLOCKED
 *   ⑦ wave_height > 1.2m + BEGINNER → BLOCKED
 *   ⑧ wave_height > 2.5m + INTERMEDIATE → WARNING
 *   ⑨ waterTemperature < 10°C → BEGINNER BLOCKED / INTERMEDIATE WARNING
 *   ⑩ waterTemperature < 14°C → BEGINNER WARNING
 *
 * 사유는 우선순위로 정렬하여 반환 (P1 생존 > P2 장비 > P3 스팟 > P4 컨디션)
 *
 * @returns 레벨별 적합도 + 우선순위 정렬된 안전 메시지
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
  /** 우선순위 부여된 안전 사유 수집용 */
  const reasons: SafetyReason[] = [];

  const breakType = spot.breakType || 'beach_break';
  const waveHeight = Number(forecast.waveHeight);
  const windSpeed = Number(forecast.windSpeed ?? 0);
  const windGusts = Number(forecast.windGusts ?? 0);
  /** gust 반영 유효 풍속: 돌풍이 심하면 풍속보다 체감이 더 나쁨 */
  const effectiveWind = Math.max(windSpeed, windGusts * 0.7);

  // ① 강풍 차단 (전 레벨) - effectiveWind 기준
  // 문구에 실제 풍속/돌풍 숫자 포함 → 사용자가 위험을 체감
  if (effectiveWind > 35) {
    levelFit.BEGINNER = 'BLOCKED';
    levelFit.INTERMEDIATE = 'BLOCKED';
    levelFit.ADVANCED = 'BLOCKED';
    const gustInfo = windGusts > windSpeed ? ` (돌풍 ${Math.round(windGusts)}km/h)` : '';
    reasons.push({
      message: `풍속 ${Math.round(windSpeed)}km/h${gustInfo} - 강풍 위험`,
      priority: 1,
    });
  }

  /**
   * ②③ 돌풍(gust) 레벨별 차등 판정
   *
   * BEGINNER:     gust ≥ 45 → BLOCKED, gust ≥ 35 → WARNING
   * INTERMEDIATE: gust ≥ 50 → BLOCKED, gust ≥ 45 → WARNING
   * ADVANCED:     점수 감점으로만 처리
   */
  if (windGusts >= 45) {
    if (levelFit.BEGINNER !== 'BLOCKED') {
      levelFit.BEGINNER = 'BLOCKED';
      reasons.push({
        message: `돌풍 ${Math.round(windGusts)}km/h - 초보자 서핑 위험`,
        priority: 1,
      });
    }
  } else if (windGusts >= 35) {
    if (levelFit.BEGINNER === 'PASS') {
      levelFit.BEGINNER = 'WARNING';
      reasons.push({
        message: `돌풍 ${Math.round(windGusts)}km/h - 초보자 주의`,
        priority: 4,
      });
    }
  }
  if (windGusts >= 50) {
    if (levelFit.INTERMEDIATE !== 'BLOCKED') {
      levelFit.INTERMEDIATE = 'BLOCKED';
      reasons.push({
        message: `돌풍 ${Math.round(windGusts)}km/h - 중급자 서핑 위험`,
        priority: 1,
      });
    }
  } else if (windGusts >= 45) {
    if (levelFit.INTERMEDIATE === 'PASS') {
      levelFit.INTERMEDIATE = 'WARNING';
      reasons.push({
        message: `돌풍 ${Math.round(windGusts)}km/h - 중급자 주의`,
        priority: 4,
      });
    }
  }

  // ④ reef/point_break + BEGINNER → BLOCKED
  if (['reef_break', 'point_break'].includes(breakType)) {
    if (levelFit.BEGINNER !== 'BLOCKED') {
      levelFit.BEGINNER = 'BLOCKED';
    }
    reasons.push({
      message: '리프/포인트 브레이크 - 초보자 서핑 금지',
      priority: 3,
    });
  }

  // ⑤ spot.difficulty ≥ ADVANCED + BEGINNER → BLOCKED
  if ([Difficulty.ADVANCED, Difficulty.EXPERT].includes(spot.difficulty)) {
    if (levelFit.BEGINNER !== 'BLOCKED') {
      levelFit.BEGINNER = 'BLOCKED';
    }
    reasons.push({
      message: '상급자 전용 스팟입니다',
      priority: 3,
    });
  }

  // ⑥ spot.difficulty = EXPERT + INTERMEDIATE → BLOCKED
  if (spot.difficulty === Difficulty.EXPERT) {
    if (levelFit.INTERMEDIATE !== 'BLOCKED') {
      levelFit.INTERMEDIATE = 'BLOCKED';
    }
    reasons.push({
      message: '전문가 전용 스팟입니다',
      priority: 3,
    });
  }

  // ⑦ 파고 > 1.2m + BEGINNER → BLOCKED
  if (waveHeight > 1.2 && levelFit.BEGINNER !== 'BLOCKED') {
    levelFit.BEGINNER = 'BLOCKED';
    reasons.push({
      message: `파고 ${waveHeight.toFixed(1)}m - 초보자에게 위험`,
      priority: 1,
    });
  }

  // ⑧ 파고 > 2.5m + INTERMEDIATE → WARNING
  if (waveHeight > 2.5 && levelFit.INTERMEDIATE !== 'BLOCKED') {
    if (levelFit.INTERMEDIATE === 'PASS') {
      levelFit.INTERMEDIATE = 'WARNING';
    }
    reasons.push({
      message: `파고 ${waveHeight.toFixed(1)}m - 주의 필요`,
      priority: 4,
    });
  }

  /**
   * ⑨⑩ 수온 안전 판정
   *
   * BEGINNER:     < 10°C → BLOCKED, < 14°C → WARNING
   * INTERMEDIATE: < 10°C → WARNING
   * ADVANCED:     수온 경고 없음 (장비 갖춤 가정)
   */
  const waterTemp = forecast.waterTemperature != null ? Number(forecast.waterTemperature) : null;
  if (waterTemp != null) {
    if (waterTemp < 10) {
      if (levelFit.BEGINNER !== 'BLOCKED') {
        levelFit.BEGINNER = 'BLOCKED';
      }
      if (levelFit.INTERMEDIATE === 'PASS') {
        levelFit.INTERMEDIATE = 'WARNING';
      }
      reasons.push({
        message: `수온 ${waterTemp.toFixed(0)}°C - 저체온증 위험`,
        priority: 1,
      });
    } else if (waterTemp < 14) {
      if (levelFit.BEGINNER === 'PASS') {
        levelFit.BEGINNER = 'WARNING';
      }
      reasons.push({
        message: `수온 ${waterTemp.toFixed(0)}°C - 웻슈트 필수`,
        priority: 2,
      });
    }
  }

  /**
   * 사유를 우선순위로 정렬 후 문자열 배열로 변환
   * P1(생존) → P2(장비) → P3(스팟) → P4(컨디션)
   * 같은 우선순위 내에서는 입력 순서(=위험 발견 순서) 유지
   */
  reasons.sort((a, b) => a.priority - b.priority);
  const safetyReasons = reasons.map(r => r.message);

  return { levelFit, safetyReasons };
}

// =============================================================
// STEP 2.5: 약풍 시 풍향 보정 (v1.4.2 - FN-2)
// 바람이 거의 없으면(글래시) 풍향이 무의미하므로 windDirFit을 올림
// =============================================================

/**
 * 약풍 시 풍향 적합도 보정 (FN-2) - v1.4.2
 *
 * 문제: windSpeed=3km/h(글래시)인데 온쇼어면 windDirFit=1 → 2점 손실
 * 현실: 바람이 거의 없으면 풍향은 사실상 무의미
 *
 * 보정 규칙:
 *   effectiveWind < 5 (글래시): windDirFit = max(기존값, 7)
 *   effectiveWind 5~8 (매우 약함): windDirFit = max(기존값, (기존값 + 7) / 2)
 *   effectiveWind ≥ 8: 보정 없음
 *
 * @param detail - 5개 항목 상세 점수 (windDirFit을 직접 갱신)
 * @param forecast - 예보 데이터 (풍속/돌풍으로 effectiveWind 계산)
 */
function applyLightWindDirCorrection(
  detail: RatingDetail,
  forecast: ForecastForRating,
): void {
  const windSpeed = Number(forecast.windSpeed ?? 0);
  const windGusts = Number(forecast.windGusts ?? 0);
  const effectiveWind = Math.max(windSpeed, windGusts * 0.7);

  if (effectiveWind < 5) {
    /** 글래시: 풍향 무의미 → windDirFit 최소 7점 보장 */
    detail.windDirFit = Math.max(detail.windDirFit, 7);
  } else if (effectiveWind < 8) {
    /** 매우 약한 바람: 풍향 영향 절반 → 기존값과 7의 중간값 */
    const corrected = (detail.windDirFit + 7) / 2;
    detail.windDirFit = Math.max(detail.windDirFit, clamp010(corrected));
  }
  // effectiveWind ≥ 8: 보정 없음 (바람이 충분히 있어 풍향이 의미 있음)
}

// =============================================================
// STEP 3.5: 보정 필터 (v1.4.1)
// 기존 엔진(하드블록 + 5Fit + 가중합)을 건드리지 않고,
// 가중합 이후에 거짓양성을 정교하게 눌러주는 보정 레이어
// =============================================================

/**
 * 복합 위험 감점 결과
 * multiplier: surfRating에 곱할 계수 (1.0이면 감점 없음)
 * warning: true면 BEGINNER의 levelFit을 WARNING으로 올림
 * reason: 감점 사유 (null이면 해당 없음)
 */
interface CompoundRiskResult {
  multiplier: number;
  warning: boolean;
  reason: string | null;
}

/**
 * 복합 위험 감점 (Compound Risk Index) - v1.4.1
 *
 * 각 위험 요소가 하드블록 임계값에 얼마나 가까운지 0~1로 측정 후
 * 가중 합산하여 riskIndex 산출 → surfRating에 multiplier 적용
 *
 * 근접도 계산 대상 (BEGINNER 기준, 3개 항목):
 *   - 돌풍(gust): 30~45km/h 범위 → (gust - 30) / 15
 *     · 하드블록 45km/h와 정렬, 가중치 1.0 (가장 결정적)
 *   - 파고: tolerableMax×0.9 ~ tolerableMax → 선형
 *     · 타이트한 범위로 "바로 아래" 케이스만 저격, 가중치 0.8
 *   - 수온: 14~16°C → (16 - temp) / 2
 *     · 대비하면 가능하므로 상대적 낮은 가중치 0.7
 *
 * ※ effectiveWind는 windSpeedFit에서 이미 반영되므로 이중 페널티 방지 위해 제외
 *
 * 감점 규칙 (v1.4.1 조정 - 2티어 간결 설계):
 *   riskIndex < 1.0 → 감점 없음 (multiplier = 1.0)
 *   1.0 ≤ riskIndex < 1.5 → ×0.70 + BEGINNER WARNING + 장비 권장 메시지
 *   riskIndex ≥ 1.5 → ×0.60 + BEGINNER WARNING + 강한 경고 메시지
 *
 *   ※ 기존 3티어(0.90/0.80/0.70)에서 2티어(0.70/0.60)로 간결화
 *     이유: max riskIndex=2.5이고 "임계값 바로 아래" 시나리오가
 *     riskIndex ~1.2~1.3에 분포하므로, 이 구간에서 확실히 눌러야 함
 *
 * @param spot - 스팟 정보 (파고 구간 조회용)
 * @param forecast - 예보 데이터
 * @param userLevel - 사용자 레벨 (BEGINNER만 WARNING 적용)
 */
function calcCompoundRiskPenalty(
  spot: SpotForRating,
  forecast: ForecastForRating,
  userLevel: Difficulty,
): CompoundRiskResult {
  /** BEGINNER가 아니면 compound risk 미적용 (중급 이상은 점수 감점만으로 충분) */
  if (userLevel !== Difficulty.BEGINNER) {
    return { multiplier: 1.0, warning: false, reason: null };
  }

  const windGusts = Number(forecast.windGusts ?? 0);
  const waveHeight = Number(forecast.waveHeight);
  const waterTemp = forecast.waterTemperature != null
    ? Number(forecast.waterTemperature) : null;

  // --- 돌풍 근접도 (가중치 1.0) ---
  // 30~45km/h 범위, 하드블록 45km/h와 정렬
  const gustNear = Math.max(0, Math.min(1, (windGusts - 30) / 15));

  // --- 파고 근접도 (가중치 0.8) ---
  // tolerableMax×0.9 ~ tolerableMax 범위 (타이트하게 "바로 아래"만 저격)
  const breakType = spot.breakType || 'beach_break';
  const template = WAVE_TEMPLATES[breakType]?.[spot.difficulty]
    || WAVE_TEMPLATES.beach_break.BEGINNER;
  const tolMax = spot.tolerableWaveMax != null
    ? Number(spot.tolerableWaveMax) : template.tolerable[1];
  const waveNearStart = tolMax * 0.9;
  const waveNearRange = tolMax - waveNearStart; // tolMax × 0.1
  let waveNear = 0;
  if (waveNearRange > 0 && waveHeight >= waveNearStart && waveHeight <= tolMax) {
    waveNear = (waveHeight - waveNearStart) / waveNearRange;
  }

  // --- 수온 근접도 (가중치 0.7) ---
  // 14~16°C 범위 (16°C 이하면 근접, 14°C 이하는 이미 하드블록 WARNING)
  let waterTempNear = 0;
  if (waterTemp != null && waterTemp >= 14 && waterTemp <= 16) {
    waterTempNear = (16 - waterTemp) / 2;
  }

  // --- 가중 합산 ---
  const GUST_WEIGHT = 1.0;
  const WAVE_WEIGHT = 0.8;
  const TEMP_WEIGHT = 0.7;
  const riskIndex =
    gustNear * GUST_WEIGHT +
    waveNear * WAVE_WEIGHT +
    waterTempNear * TEMP_WEIGHT;

  // --- 감점 규칙 (2티어) ---
  if (riskIndex < 1.0) {
    return { multiplier: 1.0, warning: false, reason: null };
  }

  if (riskIndex >= 1.5) {
    return {
      multiplier: 0.60,
      warning: true,
      reason: '복합 위험 근접 - 초급자는 웻슈트·장갑·부츠 착용 필수',
    };
  }

  // 1.0 ≤ riskIndex < 1.5
  return {
    multiplier: 0.70,
    warning: true,
    reason: '복합 위험 근접 - 초급자는 웻슈트·장갑·부츠 착용 권장',
  };
}

/**
 * 품질 게이트 결과
 * maxRating: surfRating 상한 (10이면 제한 없음)
 * warningBeginner: true면 BEGINNER의 levelFit을 WARNING으로 올림
 * reason: 상한 적용 사유 (null이면 해당 없음)
 */
interface QualityGateResult {
  maxRating: number;
  warningBeginner: boolean;
  reason: string | null;
}

/**
 * 품질 패턴 게이트 (Quality Pattern Gate) - v1.4.1
 *
 * 나쁜 조합 패턴이 감지되면 surfRating 상한을 제한하여
 * "파고가 좋아서 점수가 올라가는" 거짓양성을 차단
 *
 * 패턴 1: 온쇼어 + 짧은 주기
 *   조건: windDirFit ≤ 2 AND periodFit ≤ 2
 *   결과: surfRating 상한 4.0
 *   정책:
 *     - BEGINNER: 상한 적용 + status WARNING (서핑 비추 강조)
 *     - INTERMEDIATE/ADVANCED: 상한만 적용, status PASS 유지 ("별로인 날")
 *
 * 향후 확장: 새 패턴 추가 가능 (3~5개 이내로 관리)
 *
 * @param detail - 5개 항목별 fit 점수
 */
function applyQualityGate(detail: RatingDetail): QualityGateResult {
  /**
   * 패턴 1: 온쇼어(windDirFit ≤ 2) + 짧은 주기(periodFit ≤ 2)
   * → 파도 품질이 최악이라 파고가 좋아도 서핑 가치 없음
   */
  if (detail.windDirFit <= 2 && detail.periodFit <= 2) {
    return {
      maxRating: 4.0,
      warningBeginner: true,
      reason: '온쇼어 + 짧은 주기 - 파도 품질이 낮아 서핑 비추천',
    };
  }

  // 해당 패턴 없음 → 제한 없음
  return { maxRating: 10, warningBeginner: false, reason: null };
}

// =============================================================
// STEP 3.7: 거짓 음성 보정 (v1.4.2 - FN-1)
// 하드블록 grace zone: 특정 조건에서 BLOCKED → WARNING 완화
// =============================================================

/**
 * 하드블록 grace zone (FN-1) - v1.4.2
 *
 * 문제: 파고 1.25m → BEGINNER BLOCKED인데, 나머지 조건이 전부 완벽하면
 *       beach_break에서 실제로 서핑 가능한 경우가 있음
 *
 * 보정 조건 (ALL 충족 시에만 적용):
 *   1. levelFit.BEGINNER === 'BLOCKED' (파고 하드블록에 의해)
 *   2. waveHeight > 1.2 AND waveHeight ≤ 1.4 (grace zone 범위)
 *   3. breakType === 'beach_break' (reef/point는 절대 완화 안 함)
 *   4. 나머지 4개 fit(period, windSpeed, swell, windDir) 평균 ≥ 7.0
 *
 * 결과:
 *   - BEGINNER: BLOCKED → WARNING으로 완화 (PASS가 아님!)
 *   - 기존 안전 사유를 "경험자 동행 필수" 메시지로 교체
 *
 * 안전장치:
 *   - beach_break에서만 (reef/point 제외)
 *   - grace 상한 1.4m (초과 시 절대 완화 안 함)
 *   - 나머지 fit 평균 7.0 이상 (매우 엄격)
 *   - WARNING 유지 (PASS 아님)
 *
 * @param spot - 스팟 정보
 * @param forecast - 예보 데이터
 * @param detail - 5개 항목 상세 점수
 * @param levelFit - 현재 레벨 적합도 (수정됨)
 * @param safetyReasons - 현재 안전 사유 배열 (수정됨)
 * @returns 수정된 levelFit과 safetyReasons
 */
function applyHardBlockGraceZone(
  spot: SpotForRating,
  forecast: ForecastForRating,
  detail: RatingDetail,
  levelFit: LevelFitResult,
  safetyReasons: string[],
): { levelFit: LevelFitResult; safetyReasons: string[] } {
  const waveHeight = Number(forecast.waveHeight);
  const breakType = spot.breakType || 'beach_break';

  /** 조건 1: BEGINNER가 BLOCKED 상태여야 함 */
  if (levelFit.BEGINNER !== 'BLOCKED') return { levelFit, safetyReasons };

  /** 조건 2: 파고 grace zone (1.2 초과 ~ 1.4 이하) */
  if (waveHeight <= 1.2 || waveHeight > 1.4) return { levelFit, safetyReasons };

  /** 조건 3: beach_break에서만 완화 (reef/point는 위험) */
  if (breakType !== 'beach_break') return { levelFit, safetyReasons };

  /** 조건 4: 나머지 4개 fit 평균이 7.0 이상 (매우 엄격) */
  const otherFitAvg = (
    detail.periodFit +
    detail.windSpeedFit +
    detail.swellFit +
    detail.windDirFit
  ) / 4;
  if (otherFitAvg < 7.0) return { levelFit, safetyReasons };

  /**
   * 모든 조건 충족 → BLOCKED → WARNING으로 완화
   * 기존 파고 하드블록 사유를 "주의하며 서핑 가능" 메시지로 교체
   */
  const newLevelFit = { ...levelFit, BEGINNER: 'WARNING' as LevelFitStatus };
  const newSafetyReasons = safetyReasons.map(r =>
    r.includes('초보자에게 위험')
      ? `파고 ${waveHeight.toFixed(1)}m - 초보에겐 여전히 높은 파고, 경험자 동행 필수`
      : r,
  );

  return { levelFit: newLevelFit, safetyReasons: newSafetyReasons };
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
 * 점수 규칙 (v1.4.2 - grace margin 추가):
 *   - optimal 범위 내부(경계 포함): waveFit = 10 (최적)
 *   - optimal 밖 ~ tolerable 내부(경계 포함): 3~9 선형 감점
 *   - tolerable 밖 grace zone(±5cm): 1~2점 (측정 오차 허용)
 *   - grace 밖: waveFit = 0 (서핑 부적합)
 *   - tolerable min==max 비정상 케이스: 해당 쪽 0점 처리
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

  const optMin = spot.optimalWaveMin != null ? Number(spot.optimalWaveMin) : template.optimal[0];
  const optMax = spot.optimalWaveMax != null ? Number(spot.optimalWaveMax) : template.optimal[1];
  const tolMin = spot.tolerableWaveMin != null ? Number(spot.tolerableWaveMin) : template.tolerable[0];
  const tolMax = spot.tolerableWaveMax != null ? Number(spot.tolerableWaveMax) : template.tolerable[1];

  /**
   * CASE 1: optimal 범위 내부 (경계 포함) → 10점 (최적)
   * 예: optimal=[0.5, 1.0], 파고=0.5m 또는 1.0m → 10점
   */
  if (waveHeight >= optMin && waveHeight <= optMax) {
    return 10;
  }

  /**
   * CASE 2: optimal 아래 ~ tolerable 하한 사이 (파도가 너무 작은 쪽)
   * tolMin ~ optMin 구간에서 선형 감점 (3~9)
   * 경계값(tolMin, optMin) 모두 포함
   */
  /**
   * v1.4.2 grace margin 상수
   * 파고 측정 오차(±5cm)를 허용하여, tolerable 경계 바로 밖에서
   * 0점이 아닌 1~2점을 부여 → 거짓 음성(FN-4) 방지
   */
  const GRACE_MARGIN = 0.05;

  if (waveHeight < optMin) {
    /** tolerable 하한보다 작으면 grace zone 확인 */
    if (waveHeight < tolMin) {
      /**
       * grace zone 하한: tolMin-0.05 ~ tolMin 범위
       * tolMin에 가까울수록 2점, 멀수록 1점 (선형 보간)
       */
      if (waveHeight >= tolMin - GRACE_MARGIN) {
        const graceRatio = (waveHeight - (tolMin - GRACE_MARGIN)) / GRACE_MARGIN;
        return clamp010(1 + graceRatio);  // 1~2점
      }
      return 0;
    }
    /** tolMin == optMin 비정상 케이스: 0÷0 방지 */
    const lowerRange = optMin - tolMin;
    if (lowerRange <= 0) return 3;
    /** tolMin이면 3점, optMin에 가까울수록 9점 */
    const ratio = (waveHeight - tolMin) / lowerRange;
    return clamp010(3 + 6 * ratio);
  }

  /**
   * CASE 3: optimal 위 ~ tolerable 상한 사이 (파도가 너무 큰 쪽)
   * optMax ~ tolMax 구간에서 선형 감점 (9~3)
   * 경계값(optMax, tolMax) 모두 포함
   */
  /** tolerable 상한보다 크면 grace zone 확인 */
  if (waveHeight > tolMax) {
    /**
     * grace zone 상한: tolMax ~ tolMax+0.05 범위
     * tolMax에 가까울수록 2점, 멀수록 1점 (선형 보간)
     */
    if (waveHeight <= tolMax + GRACE_MARGIN) {
      const graceRatio = 1 - (waveHeight - tolMax) / GRACE_MARGIN;
      return clamp010(1 + graceRatio);  // 2~1점
    }
    return 0;
  }
  /** optMax == tolMax 비정상 케이스: 0÷0 방지 */
  const upperRange = tolMax - optMax;
  if (upperRange <= 0) return 3;
  /** optMax에 가까우면 9점, tolMax이면 3점 */
  const ratio = (waveHeight - optMax) / upperRange;
  return clamp010(9 - 6 * ratio);
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
 * ④ 스웰 매칭 점수 (swellFit) - 가중치 25% (v1.4 개선)
 *
 * 3가지 요소를 종합:
 *   A. 방향 매칭 (60%): 스웰 방향과 스팟 최적 방향의 각도차
 *   B. 스웰 높이 (25%): 스웰이 충분히 있어야 의미 있음
 *   C. 스웰 주기 (15%): 긴 주기 = ground swell = 품질 좋음
 *
 * swellDirection이 없으면 waveDirection으로 대체 (폴백)
 */
function calcSwellFit(spot: SpotForRating, forecast: ForecastForRating): number {
  /**
   * A. 방향 매칭 점수 (0~10)
   * swell_wave_direction 우선, 없으면 wave_direction 폴백
   */
  const swellDeg = forecast.swellDirection != null
    ? Number(forecast.swellDirection)
    : Number(forecast.waveDirection);
  if (isNaN(swellDeg)) return 5; // 방향 데이터 전혀 없음 → 중간값

  const bestDeg = directionToDeg(spot.bestSwellDirection);
  if (bestDeg == null) return 5; // 스팟 최적 방향 미설정 → 중간값

  const spread = spot.bestSwellSpreadDeg || getDefaultSpread(spot.breakType);
  const delta = angularDiff(swellDeg, bestDeg);
  const dirScore = clamp010(10 * (1 - delta / spread));

  /**
   * B. 스웰 높이 점수 (0~10)
   * 0.3m 이하: 스웰 거의 없음 → 0점
   * 0.3~1.5m: 선형 증가 → 0~8점
   * 1.5m 이상: 충분한 스웰 → 10점
   */
  let heightScore = 5; // 데이터 없으면 중간값
  if (forecast.swellHeight != null) {
    const sh = Number(forecast.swellHeight);
    if (sh < 0.3) heightScore = 0;
    else if (sh >= 1.5) heightScore = 10;
    else heightScore = clamp010(((sh - 0.3) / 1.2) * 10);
  }

  /**
   * C. 스웰 주기 점수 (0~10)
   * 6초 이하: wind swell → 낮은 점수
   * 10초 이상: ground swell → 높은 점수
   */
  let periodScore = 5; // 데이터 없으면 중간값
  if (forecast.swellPeriod != null) {
    const sp = Number(forecast.swellPeriod);
    if (sp >= 14) periodScore = 10;
    else if (sp >= 10) periodScore = 8;
    else if (sp >= 8) periodScore = 6;
    else if (sp >= 6) periodScore = 3;
    else periodScore = 1;
  }

  /** 가중 합산: 방향 60% + 높이 25% + 주기 15% */
  return clamp010(dirScore * 0.6 + heightScore * 0.25 + periodScore * 0.15);
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
 * 서핑 적합도 종합 계산 (v1.4.2)
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
  // ⚠️ levelFit, safetyReasons는 STEP 3.5 보정에서 수정 가능하므로 let 선언
  let { levelFit, safetyReasons } = checkHardBlock(spot, forecast);

  // ----- STEP 2: 5개 항목 fit 점수 계산 (하드블록과 무관하게 항상 계산) -----
  const detail: RatingDetail = {
    waveFit: calcWaveFit(spot, forecast),
    periodFit: calcPeriodFit(forecast),
    windSpeedFit: calcWindSpeedFit(forecast),
    swellFit: calcSwellFit(spot, forecast),
    windDirFit: calcWindDirFit(spot, forecast),
  };

  // ----- ★ STEP 2.5: 약풍 시 풍향 보정 (v1.4.2 - FN-2) -----
  // 바람이 거의 없으면 풍향이 무의미하므로 windDirFit을 올려줌
  applyLightWindDirCorrection(detail, forecast);

  // ----- STEP 3: 가중 합산 → rawSurfRating (0~10) -----
  const rawScore =
    detail.waveFit     * WEIGHTS.wave +
    detail.periodFit   * WEIGHTS.period +
    detail.windSpeedFit * WEIGHTS.windSpeed +
    detail.swellFit    * WEIGHTS.swell +
    detail.windDirFit  * WEIGHTS.windDir;

  /**
   * 파고 페널티: waveFit이 낮으면 전체 점수를 비례 감소
   *
   * 파도가 없으면 아무리 바람/방향이 좋아도 서핑 불가.
   * waveFit 3 이하일 때 페널티 적용 (0이면 ×0.2, 3이면 ×1.0)
   *
   * 예시:
   *   waveFit=0 → multiplier=0.2 → 최대 2점 (기존: 6점 가능)
   *   waveFit=1 → multiplier=0.47 → 약 절반
   *   waveFit=2 → multiplier=0.73
   *   waveFit=3 → multiplier=1.0 (페널티 없음)
   *   waveFit≥3 → multiplier=1.0
   */
  const WAVE_PENALTY_THRESHOLD = 3;
  const WAVE_PENALTY_FLOOR = 0.2;
  let waveMultiplier = 1.0;
  if (detail.waveFit < WAVE_PENALTY_THRESHOLD) {
    waveMultiplier = WAVE_PENALTY_FLOOR
      + (1 - WAVE_PENALTY_FLOOR) * (detail.waveFit / WAVE_PENALTY_THRESHOLD);
  }

  let surfRating = clamp010(rawScore * waveMultiplier);

  // ----- ★ STEP 3.5: 보정 필터 적용 (v1.4.1) -----
  // 기존 엔진의 점수 산출 이후, 거짓양성을 정교하게 눌러주는 보정 레이어
  // 적용 순서: ① compound risk multiplier → ② quality gate cap

  /** ① 복합 위험 감점 - gust/파고/수온 근접도 가중 합산 */
  const compoundRisk = calcCompoundRiskPenalty(spot, forecast, userLevel);
  if (compoundRisk.multiplier < 1.0) {
    surfRating = clamp010(surfRating * compoundRisk.multiplier);
  }
  if (compoundRisk.warning && levelFit.BEGINNER === 'PASS') {
    levelFit = { ...levelFit, BEGINNER: 'WARNING' };
  }
  if (compoundRisk.reason) {
    // P2(안전 근접) 우선순위 - 하드블록 P1 뒤에 배치
    safetyReasons = [...safetyReasons, compoundRisk.reason];
  }

  /** ② 품질 패턴 게이트 - 나쁜 조합 패턴 시 상한 제한 */
  const qualityGate = applyQualityGate(detail);
  if (surfRating > qualityGate.maxRating) {
    surfRating = clamp010(qualityGate.maxRating);
  }
  if (qualityGate.warningBeginner && levelFit.BEGINNER === 'PASS') {
    levelFit = { ...levelFit, BEGINNER: 'WARNING' };
  }
  if (qualityGate.reason) {
    // P4(컨디션/품질) 우선순위 - 가장 뒤에 배치
    safetyReasons = [...safetyReasons, qualityGate.reason];
  }

  // ----- ★ STEP 3.7: 거짓 음성 보정 (v1.4.2) -----
  // 거짓양성 보정(3.5) 이후, 안전을 해치지 않는 범위에서 거짓음성 완화
  // ③ 하드블록 grace zone: beach_break + 1.2~1.4m + 좋은 조건 → WARNING으로 완화
  const graceResult = applyHardBlockGraceZone(spot, forecast, detail, levelFit, safetyReasons);
  levelFit = graceResult.levelFit;
  safetyReasons = graceResult.safetyReasons;

  // ----- STEP 4: 추천 메시지 생성 (보정된 surfRating 사용) -----
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
