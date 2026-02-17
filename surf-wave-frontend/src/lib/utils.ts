/**
 * @file utils.ts
 * @description 공통 유틸리티 함수 - Surfline 신호등 색상 시스템
 *
 * 색상 체계:
 * EPIC (9-10): #9B59B6 (보라) - 최상급 서핑 컨디션
 * GREAT (7-8): #2ECC71 (초록) - 좋은 서핑 컨디션
 * GOOD (5-6): #82E0AA (연초록) - 괜찮은 서핑 컨디션
 * FAIR (3-4): #F1C40F (노랑) - 보통 서핑 컨디션
 * POOR (1-2): #E67E22 (주황) - 나쁜 서핑 컨디션
 * FLAT (0): #95A5A6 (회색) - 파도 없음
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind 클래스 병합 유틸리티 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * surfRating(0~10) 기준 등급 텍스트 반환
 * Surfline 스타일 6단계 등급 체계
 */
export function getRatingGrade(rating: number): string {
  if (rating >= 9) return 'EPIC';
  if (rating >= 7) return 'GREAT';
  if (rating >= 5) return 'GOOD';
  if (rating >= 3) return 'FAIR';
  if (rating >= 1) return 'POOR';
  return 'FLAT';
}

/**
 * surfRating(0~10) 기준 신호등 색상 반환
 * 보라 → 초록 → 연초록 → 노랑 → 주황 → 회색
 */
export function getRatingColor(rating: number): string {
  if (rating >= 9) return '#9B59B6';  // 보라 - EPIC
  if (rating >= 7) return '#2ECC71';  // 초록 - GREAT
  if (rating >= 5) return '#82E0AA';  // 연초록 - GOOD
  if (rating >= 3) return '#F1C40F';  // 노랑 - FAIR
  if (rating >= 1) return '#E67E22';  // 주황 - POOR
  return '#95A5A6';                    // 회색 - FLAT
}

/**
 * 레벨 적합도(PASS/WARNING/BLOCKED) 기준 색상 반환
 * 초록: 안전, 노랑: 주의, 빨강: 위험
 */
export function getLevelFitColor(fit: string): string {
  switch (fit) {
    case 'PASS': return '#2ECC71';     // 초록 - 안전
    case 'WARNING': return '#F1C40F';  // 노랑 - 주의
    case 'BLOCKED': return '#E74C3C';  // 빨강 - 위험
    default: return '#95A5A6';
  }
}

/**
 * 레벨 적합도(PASS/WARNING/BLOCKED) 기준 한국어 라벨 반환
 */
export function getLevelFitLabel(fit: string): string {
  switch (fit) {
    case 'PASS': return '안전';
    case 'WARNING': return '주의';
    case 'BLOCKED': return '위험';
    default: return '-';
  }
}
