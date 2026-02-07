/**
 * @file date.util.ts
 * @description 날짜/시간 유틸리티 함수 모음
 *
 * 서핑 다이어리의 날짜 필터링, 캘린더 조회, 파도 예보 날짜 계산 등
 * 애플리케이션 전반에서 사용되는 날짜 관련 헬퍼 함수들입니다.
 */

/**
 * getStartOfDay - 해당 날짜의 시작 시각을 반환 (00:00:00.000)
 * DB 쿼리에서 날짜 범위의 시작점으로 사용
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * getEndOfDay - 해당 날짜의 종료 시각을 반환 (23:59:59.999)
 * DB 쿼리에서 날짜 범위의 끝점으로 사용
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * formatDate - 날짜를 YYYY-MM-DD 문자열로 포맷팅
 * 서핑 다이어리 날짜 표시, API 응답 등에 사용
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * formatDateTime - 날짜를 ISO 8601 형식 문자열로 변환
 * API 응답의 timestamp 필드 등에 사용 (예: "2024-01-15T09:30:00.000Z")
 */
export function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * getDaysAgo - 현재로부터 N일 전의 날짜를 반환
 * 예: getDaysAgo(7) → 7일 전 날짜 (최근 1주일 데이터 조회 등에 활용)
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * isToday - 주어진 날짜가 오늘인지 확인
 * 서핑 스팟 투표의 일일 제한 확인 등에 사용
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * getMonthRange - 특정 연/월의 시작일과 마지막일을 반환
 * 캘린더 뷰에서 해당 월의 다이어리 조회 시 사용
 * @param year - 연도 (예: 2024)
 * @param month - 월 (1~12)
 */
export function getMonthRange(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}
