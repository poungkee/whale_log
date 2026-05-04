/**
 * @file wind.ts
 * @description 풍향 표시 형식 통일 유틸 (Task #55)
 *
 * 통일 정책: "라벨 · 방위 (도수)" 순서
 * 예: "오프쇼어 · 남서 (227°)"
 *
 * 중요도 순서:
 * 1. 라벨 — 서퍼에게 가장 중요 (오프쇼어=좋음, 온쇼어=나쁨)
 * 2. 방위 — 직관적 방향 (도수보다 이해 쉬움)
 * 3. 도수 — 보조 정보 (정확도 알고 싶을 때만)
 *
 * 색상 정책:
 * - OFFSHORE → 초록 #2ECC71 (좋음)
 * - CROSS    → 노랑 #F1C40F (보통)
 * - ONSHORE  → 빨강 #E74C3C (나쁨)
 */

/** 풍향 종류 (해변 방향 vs 바람 방향 비교) */
export type WindType = 'OFFSHORE' | 'CROSS' | 'ONSHORE' | '';

/**
 * 도수(°)를 한국어 16방위로 변환
 * 예: 0 → 북, 90 → 동, 180 → 남, 270 → 서, 225 → 남서
 */
export function degToCompassKo(deg: number): string {
  const dirs = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
                '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[idx];
}

/**
 * 풍향(°) + 해변방향(°) 비교 → OFFSHORE/CROSS/ONSHORE 판정
 *
 * 핵심: windDir은 "불어오는(FROM) 방향" — 바람이 가는 방향(TO)으로 변환 후 비교
 * 예: windDir=270°(서쪽에서 불어옴) → windTo=90°(동쪽으로 감)
 *     해변이 동향(coastFacingDeg=90°)이면 → 해변→바다 방향 = OFFSHORE
 *
 * 판정 기준 (windTo vs coastFacingDeg):
 * - 차이 < 60°:  OFFSHORE (해변에서 바다로 — 좋음)
 * - 차이 > 120°: ONSHORE (바다에서 해변으로 — 나쁨)
 * - 60~120°:    CROSS (옆에서 — 보통)
 *
 * @param windDir 바람이 불어오는 방향 (°)
 * @param coastFacingDeg 해변이 바라보는 방향 (°), null이면 판정 불가
 */
export function getWindType(windDir: number | null, coastFacingDeg: number | null): WindType {
  if (windDir == null || coastFacingDeg == null) return '';
  /** FROM → TO 방향 변환 (180° 회전) */
  const windTo = (windDir + 180) % 360;
  let angle = Math.abs(windTo - coastFacingDeg) % 360;
  if (angle > 180) angle = 360 - angle;
  if (angle < 60) return 'OFFSHORE';
  if (angle > 120) return 'ONSHORE';
  return 'CROSS';
}

/** WindType → 한국어 라벨 (사용자 화면에 표시) */
export function getWindTypeLabel(type: WindType | string): string {
  switch (type) {
    case 'OFFSHORE': return '오프쇼어';
    case 'ONSHORE':  return '온쇼어';
    case 'CROSS':    return '사이드쇼어';
    default: return '';
  }
}

/** WindType → 신호등 색상 (Surfline 스타일) */
export function getWindTypeColor(type: WindType | string): string {
  switch (type) {
    case 'OFFSHORE': return '#2ECC71';
    case 'ONSHORE':  return '#E74C3C';
    case 'CROSS':    return '#F1C40F';
    default: return '#95A5A6';
  }
}

/**
 * 풍향 풀 표시 형식 — 메인 패턴 "오프쇼어 · 남서 (227°)"
 *
 * 데이터가 부족하면 단계적으로 fallback:
 * - 라벨 + 방위 + 도수: "오프쇼어 · 남서 (227°)" (모든 데이터 있음)
 * - 방위 + 도수: "남서 (227°)" (해변방향 없어 라벨 판정 불가)
 * - 도수만: "227°" (방위 변환 실패 — 거의 발생 X)
 * - 빈 문자열: "" (풍향 데이터 없음)
 *
 * @param windDirDeg 풍향 도수 (string 또는 number, null 허용)
 * @param coastFacingDeg 해변방향 도수 (라벨 판정용, null 허용)
 */
export function formatWindDirection(
  windDirDeg: string | number | null | undefined,
  coastFacingDeg: number | null = null,
): string {
  if (windDirDeg == null || windDirDeg === '') return '';
  const deg = typeof windDirDeg === 'string' ? parseFloat(windDirDeg) : windDirDeg;
  if (isNaN(deg)) return '';

  const compass = degToCompassKo(deg);
  const type = getWindType(deg, coastFacingDeg);
  const label = getWindTypeLabel(type);

  /** 라벨이 있으면 "오프쇼어 · 남서 (227°)", 없으면 "남서 (227°)" */
  const degText = `(${deg.toFixed(0)}°)`;
  if (label) {
    return `${label} · ${compass} ${degText}`;
  }
  return `${compass} ${degText}`;
}

/**
 * 짧은 풍향 표시 — 카드/리스트용 "오프쇼어 · 남서"
 * 도수 생략, 직관성 우선
 */
export function formatWindDirectionShort(
  windDirDeg: string | number | null | undefined,
  coastFacingDeg: number | null = null,
): string {
  if (windDirDeg == null || windDirDeg === '') return '';
  const deg = typeof windDirDeg === 'string' ? parseFloat(windDirDeg) : windDirDeg;
  if (isNaN(deg)) return '';

  const compass = degToCompassKo(deg);
  const type = getWindType(deg, coastFacingDeg);
  const label = getWindTypeLabel(type);

  return label ? `${label} · ${compass}` : compass;
}
