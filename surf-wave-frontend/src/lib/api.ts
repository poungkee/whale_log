/**
 * @file api.ts
 * @description API 호출 유틸 — 환경별 Base URL 자동 분기
 *
 * 로컬 개발: VITE_API_BASE_URL 미설정 → '' (Vite proxy 사용)
 * 프로덕션: VITE_API_BASE_URL='https://whale-log-api.up.railway.app' → 절대 URL
 *
 * 사용법:
 *   import { api } from '../lib/api';
 *   const res = await fetch(api('/api/v1/dashboard/forecasts'));
 */

/** API Base URL — 환경변수 없으면 빈 문자열 (로컬 Vite proxy 호환) */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * API 경로에 Base URL을 붙여서 반환
 * @param path - API 경로 (예: '/api/v1/spots')
 * @returns 전체 URL (예: 'https://xxx.railway.app/api/v1/spots' 또는 '/api/v1/spots')
 */
export function api(path: string): string {
  return `${API_BASE}${path}`;
}
