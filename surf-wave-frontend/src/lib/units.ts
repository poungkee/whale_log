/**
 * @file units.ts
 * @description 단위 변환 유틸 — 서핑 표준 단위로 통일 (Task #54)
 *
 * 풍속 단위 정책:
 * - DB 저장: km/h (Open-Meteo 원본)
 * - 화면 표시: m/s (서핑 표준 — WSB FARM, Surfline, KHOA 일치)
 * - 변환: km/h ÷ 3.6 = m/s
 *
 * 이 유틸 한 곳에서 변환 → 일관성 보장.
 */

/**
 * km/h → m/s 변환 (서핑 표준 단위로 표시)
 * @param kmh km/h 값 (string | number | null | undefined)
 * @param decimals 소수점 자리 (기본 1)
 * @returns "3.3" 같은 문자열, null이면 "-"
 */
export function kmhToMs(kmh: string | number | null | undefined, decimals = 1): string {
  if (kmh == null || kmh === '') return '-';
  const num = typeof kmh === 'string' ? parseFloat(kmh) : kmh;
  if (isNaN(num)) return '-';
  return (num / 3.6).toFixed(decimals);
}

/**
 * km/h → m/s + 단위 라벨 함께
 * 예: 12 → "3.3m/s"
 */
export function formatWindSpeed(kmh: string | number | null | undefined): string {
  return `${kmhToMs(kmh)}m/s`;
}
