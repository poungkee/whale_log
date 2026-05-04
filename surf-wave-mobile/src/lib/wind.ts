// 풍향 표시 형식 통일 유틸 (Task #55, 모바일)
// 웹앱 surf-wave-frontend/src/lib/wind.ts와 동일 로직.
//
// 통일 정책: "라벨 · 방위 (도수)" 순서
// 예: "오프쇼어 · 남서 (227°)"
//
// 색상 정책:
// - OFFSHORE → 초록 #2ECC71 (좋음)
// - CROSS    → 노랑 #F1C40F (보통)
// - ONSHORE  → 빨강 #E74C3C (나쁨)

export type WindType = 'OFFSHORE' | 'CROSS' | 'ONSHORE' | '';

/** 도수(°) → 한국어 16방위 */
export function degToCompassKo(deg: number): string {
  const dirs = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
                '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[idx];
}

/**
 * 풍향과 해변방향 비교 → OFFSHORE/CROSS/ONSHORE 판정
 * 핵심: windDir은 "불어오는 방향(FROM)" → 바람이 가는 방향(TO)으로 변환 후 비교
 */
export function getWindType(windDir: number | null, coastFacingDeg: number | null): WindType {
  if (windDir == null || coastFacingDeg == null) return '';
  const windTo = (windDir + 180) % 360;
  let angle = Math.abs(windTo - coastFacingDeg) % 360;
  if (angle > 180) angle = 360 - angle;
  if (angle < 60) return 'OFFSHORE';
  if (angle > 120) return 'ONSHORE';
  return 'CROSS';
}

/** WindType → 한국어 라벨 */
export function getWindTypeLabel(type: WindType | string): string {
  switch (type) {
    case 'OFFSHORE': return '오프쇼어';
    case 'ONSHORE':  return '온쇼어';
    case 'CROSS':    return '사이드쇼어';
    default: return '';
  }
}

/** WindType → 신호등 색상 */
export function getWindTypeColor(type: WindType | string): string {
  switch (type) {
    case 'OFFSHORE': return '#2ECC71';
    case 'ONSHORE':  return '#E74C3C';
    case 'CROSS':    return '#F1C40F';
    default: return '#95A5A6';
  }
}

/** 풍향 풀 표시 형식 — "오프쇼어 · 남서 (227°)" */
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

  const degText = `(${deg.toFixed(0)}°)`;
  if (label) {
    return `${label} · ${compass} ${degText}`;
  }
  return `${compass} ${degText}`;
}

/** 짧은 풍향 표시 — "오프쇼어 · 남서" (도수 생략) */
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
