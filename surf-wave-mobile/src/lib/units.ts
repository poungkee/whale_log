// 단위 변환 유틸 — 서핑 표준 단위로 통일 (Task #54, 모바일)
// 웹앱 surf-wave-frontend/src/lib/units.ts와 동일 로직.
//
// 풍속 단위 정책:
// - DB 저장: km/h (Open-Meteo 원본)
// - 화면 표시: m/s (서핑 표준)
// - 변환: km/h ÷ 3.6 = m/s

export function kmhToMs(
  kmh: string | number | null | undefined,
  decimals = 1,
): string {
  if (kmh == null || kmh === '') return '-';
  const num = typeof kmh === 'string' ? parseFloat(kmh) : kmh;
  if (isNaN(num)) return '-';
  return (num / 3.6).toFixed(decimals);
}

export function formatWindSpeed(
  kmh: string | number | null | undefined,
): string {
  return `${kmhToMs(kmh)}m/s`;
}
