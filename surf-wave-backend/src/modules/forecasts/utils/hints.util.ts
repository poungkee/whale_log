/**
 * @file hints.util.ts
 * @description C-7 메시지 방어 hints 생성 유틸리티 (v1.5)
 *
 * surf-rating.util.ts = "점수 엔진" (고정)
 * hints.util.ts = "프레젠테이션" (변동)
 *
 * 입력: detail(5개 fit점수) + boardType + safetyReasons + waveHeight + windSpeed + wavePeriod
 * 출력: 태그 배열(최대 3개) + 메시지(최대 2문장을 공백으로 합친 1줄)
 *
 * 규칙 우선순위: 5(안전) → 1(파고) → 2(바람) → 4(스웰) → 3(주기) → 보드팁 → 전체 컨디션
 *
 * C-7 방어 전략:
 * - 점수 cap 안 건드림 (엔진 영역)
 * - 메시지 + 배지(tags)로 "왜 이 점수인지" 설명
 * - 비로그인 사용자는 공통 메시지만 표시
 * - 안전 경고가 있으면 보드 팁 생략 (safetyReasons.length > 0 체크)
 */

import { UserBoardType } from '../../../common/enums/user-board-type.enum';

/** 힌트 태그 - 프론트엔드에서 배지로 표시 */
export type HintTag =
  | 'SAFETY_WARNING'   // 안전 경고 (빨강)
  | 'WAVE_TOO_SMALL'   // 파도가 너무 작음
  | 'WAVE_TOO_BIG'     // 파도가 너무 큼
  | 'STRONG_WIND'      // 바람 강함
  | 'ONSHORE_WIND'     // 온쇼어 바람
  | 'OFFSHORE_WIND'    // 오프쇼어 바람 (좋음)
  | 'GOOD_SWELL'       // 스웰 양호
  | 'BAD_SWELL'        // 스웰 방향 안 맞음
  | 'SHORT_PERIOD'     // 주기 짧음
  | 'LONG_PERIOD'      // 주기 김 (좋음)
  | 'LONGBOARD_TIP'    // 롱보드 팁
  | 'MIDLENGTH_TIP'    // 미드렝스 팁
  | 'SHORTBOARD_TIP'   // 숏보드 팁
  | 'GREAT_CONDITION';  // 전반적 좋은 컨디션

/** hints 구조 - API 응답에 포함 */
export interface Hints {
  /** 태그 배열 - 프론트엔드에서 배지로 표시 */
  tags: HintTag[];
  /** 한국어 힌트 메시지 - 최대 2문장을 공백으로 합친 1줄 */
  message: string;
}

/** hints 생성에 필요한 입력 데이터 */
export interface HintsInput {
  /** 5개 fit 점수 (각 0~10) - null이면 예보 없음 */
  detail: {
    waveFit: number;
    periodFit: number;
    windSpeedFit: number;
    swellFit: number;
    windDirFit: number;
  } | null;
  /** 종합 surfRating (0~10) */
  surfRating: number;
  /** 안전 경고 사유 배열 */
  safetyReasons: string[];
  /** 사용자 보드 타입 */
  boardType: UserBoardType;
  /** 원본 예보 데이터 (파고, 풍속 등 - 메시지 생성용) */
  waveHeight: number | null;
  windSpeed: number | null;
  wavePeriod: number | null;
}

/**
 * hints 생성 메인 함수
 *
 * 규칙 우선순위: 5(안전) → 1(파고) → 2(바람) → 4(스웰) → 3(주기)
 * 최대 3개 태그 + 1개 메시지 생성
 */
export function generateHints(input: HintsInput): Hints {
  const { detail, surfRating, safetyReasons, boardType, waveHeight, windSpeed, wavePeriod } = input;
  const tags: HintTag[] = [];
  const messages: string[] = [];

  // ===== 규칙 5: 안전 경고 (최우선) =====
  if (safetyReasons.length > 0) {
    tags.push('SAFETY_WARNING');
    messages.push(safetyReasons[0]); // 첫 번째 안전 사유만 메시지에
  }

  // 예보 데이터 없으면 공통 메시지만
  if (!detail) {
    return {
      tags,
      message: messages.length > 0 ? messages.join(' ') : '예보 데이터가 없습니다.',
    };
  }

  // ===== 규칙 1: 파고 판정 =====
  if (detail.waveFit <= 3 && waveHeight !== null) {
    if (waveHeight < 0.3) {
      tags.push('WAVE_TOO_SMALL');
      messages.push('파도가 너무 작아요.');
    } else if (waveHeight <= 0.5) {
      // 0.3~0.5m: 매우 잔잔 — 태그는 WAVE_TOO_SMALL이지만 메시지는 부드럽게
      tags.push('WAVE_TOO_SMALL');
      messages.push('파도가 많이 잔잔해요.');
    } else if (waveHeight > 2.5) {
      tags.push('WAVE_TOO_BIG');
      messages.push('파도가 매우 높아요. 주의하세요.');
    }
  }

  // ===== 규칙 2: 바람 판정 =====
  if (detail.windSpeedFit <= 4 && windSpeed !== null && windSpeed > 25) {
    tags.push('STRONG_WIND');
    messages.push('바람이 강해요.');
  }
  if (detail.windDirFit >= 7) {
    tags.push('OFFSHORE_WIND');
  } else if (detail.windDirFit <= 3) {
    tags.push('ONSHORE_WIND');
  }

  // ===== 규칙 4: 스웰 판정 =====
  if (detail.swellFit >= 7) {
    tags.push('GOOD_SWELL');
  } else if (detail.swellFit <= 3) {
    tags.push('BAD_SWELL');
    if (messages.length < 2) {
      messages.push('스웰 방향이 안 맞아요.');
    }
  }

  // ===== 규칙 3: 주기 판정 =====
  if (detail.periodFit >= 7) {
    tags.push('LONG_PERIOD');
  } else if (detail.periodFit <= 3 && wavePeriod !== null && wavePeriod < 6) {
    tags.push('SHORT_PERIOD');
    if (messages.length < 2) {
      messages.push('주기가 짧아 파도 질이 떨어져요.');
    }
  }

  // ===== 보드 타입별 추가 팁 =====
  // 각 보드 타입에 맞는 파고 구간별 메시지를 제공
  // 안전 경고가 있을 때는 보드 팁 생략 (안전 메시지 우선)
  if (boardType !== UserBoardType.UNSET && safetyReasons.length === 0 && waveHeight !== null) {
    if (boardType === UserBoardType.LONGBOARD) {
      if (waveHeight <= 0.5 && surfRating >= 3) {
        // 매우 잔잔: 롱보드만 가능한 작은 파도
        tags.push('LONGBOARD_TIP');
        if (messages.length < 2) {
          messages.push('롱보드로 여유롭게 즐기기 좋은 파도예요!');
        }
      } else if (waveHeight <= 1.0 && surfRating >= 4) {
        // 잔잔~적당: 롱보드 최적 구간
        tags.push('LONGBOARD_TIP');
        if (messages.length < 2) {
          messages.push('롱보드에 딱 맞는 컨디션이에요!');
        }
      } else if (waveHeight <= 1.5) {
        // 적당~약간 높음: 롱보드 가능하지만 주의
        tags.push('LONGBOARD_TIP');
        if (messages.length < 2) {
          messages.push('롱보드로 탈 수 있지만 파도가 좀 있어요.');
        }
      } else if (waveHeight > 1.5) {
        // 높음: 롱보드에 부담 → 미드렝스 추천 (숏보드보다 전환이 자연스러움)
        tags.push('LONGBOARD_TIP');
        if (messages.length < 2) {
          messages.push('롱보드에는 파도가 높아요. 미드렝스나 숏보드를 추천해요.');
        }
      }
    } else if (boardType === UserBoardType.MIDLENGTH) {
      if (waveHeight < 0.3) {
        // 너무 작음: 미드렝스도 어려움
        tags.push('MIDLENGTH_TIP');
        if (messages.length < 2) {
          messages.push('미드렝스에도 파도가 좀 부족해요.');
        }
      } else if (waveHeight <= 0.8 && surfRating >= 3) {
        // 잔잔: 미드렝스 안정적
        tags.push('MIDLENGTH_TIP');
        if (messages.length < 2) {
          messages.push('미드렝스로 안정적으로 즐길 수 있어요!');
        }
      } else if (waveHeight <= 1.8 && surfRating >= 5) {
        // 적당~높음: 미드렝스 최적
        tags.push('MIDLENGTH_TIP');
        if (messages.length < 2) {
          messages.push('미드렝스에 딱 좋은 파도예요!');
        }
      } else if (waveHeight <= 2.5) {
        // 1.8~2.5m: 미드렝스 가능하지만 파도가 큰 구간
        tags.push('MIDLENGTH_TIP');
        if (messages.length < 2) {
          messages.push('미드렝스로 가능하지만 파도가 좀 커요.');
        }
      } else if (waveHeight > 2.5) {
        // 매우 높음: 미드렝스 주의
        tags.push('MIDLENGTH_TIP');
        if (messages.length < 2) {
          messages.push('파도가 높아요. 숏보드가 더 유리할 수 있어요.');
        }
      }
    } else if (boardType === UserBoardType.SHORTBOARD) {
      if (waveHeight < 0.5) {
        // 너무 작음: 숏보드 불가
        tags.push('SHORTBOARD_TIP');
        if (messages.length < 2) {
          messages.push('숏보드에는 파도가 너무 작아요.');
        }
      } else if (waveHeight < 0.8) {
        // 작음: 숏보드 어려움
        tags.push('SHORTBOARD_TIP');
        if (messages.length < 2) {
          messages.push('숏보드에는 파도가 좀 약해요. 롱보드를 추천해요.');
        }
      } else if (waveHeight < 1.0) {
        // 0.8~1.0m: 숏보드 가능하지만 아슬아슬한 구간
        tags.push('SHORTBOARD_TIP');
        if (messages.length < 2) {
          messages.push('숏보드로 탈 수 있지만 파도가 좀 약해요.');
        }
      } else if (waveHeight <= 2.5 && surfRating >= 5) {
        // 1.0~2.5m + 좋은 컨디션: 숏보드 최적
        tags.push('SHORTBOARD_TIP');
        if (messages.length < 2) {
          messages.push('숏보드로 신나게 탈 수 있는 컨디션!');
        }
      } else if (waveHeight <= 2.5) {
        // 1.0~2.5m + 컨디션 보통: 숏보드 가능
        tags.push('SHORTBOARD_TIP');
        if (messages.length < 2) {
          messages.push('숏보드로 탈 수 있지만 컨디션을 확인하세요.');
        }
      } else if (waveHeight > 2.5 && surfRating >= 4) {
        // 매우 높음: 숏보드 고급
        tags.push('SHORTBOARD_TIP');
        if (messages.length < 2) {
          messages.push('큰 파도! 숏보드로 도전해보세요.');
        }
      }
    }
  }

  // ===== 전반적 좋은 컨디션 판정 =====
  if (surfRating >= 7 && safetyReasons.length === 0) {
    tags.push('GREAT_CONDITION');
    if (messages.length === 0) {
      messages.push('오늘 컨디션 좋아요!');
    }
  }

  // 최대 3개 태그로 제한
  const finalTags = tags.slice(0, 3);

  // 메시지 없으면 기본 메시지
  const finalMessage = messages.length > 0
    ? messages.slice(0, 2).join(' ')
    : surfRating >= 5 ? '서핑하기 괜찮은 컨디션이에요.' : '컨디션을 확인하고 출발하세요.';

  return { tags: finalTags, message: finalMessage };
}

/**
 * 비로그인 사용자용 공통 hints 생성 (boardType 없이)
 */
export function generatePublicHints(input: Omit<HintsInput, 'boardType'>): Hints {
  return generateHints({ ...input, boardType: UserBoardType.UNSET });
}
