/**
 * @file paginated-response.dto.ts
 * @description 페이지네이션 응답 DTO - 목록 조회 API의 표준 응답 형식
 *
 * 모든 페이지네이션 목록 조회 API는 이 형식으로 응답합니다.
 * items 배열과 함께 현재 페이지, 전체 개수, 다음/이전 페이지 존재 여부 등의 메타 정보를 포함합니다.
 *
 * @example 응답 형식:
 * {
 *   "items": [...],
 *   "meta": {
 *     "page": 1, "limit": 20, "totalItems": 150,
 *     "totalPages": 8, "hasNextPage": true, "hasPreviousPage": false
 *   }
 * }
 */

/** 페이지네이션 메타 정보 인터페이스 */
export interface PaginationMeta {
  page: number;           // 현재 페이지 번호
  limit: number;          // 한 페이지당 항목 수
  totalItems: number;     // 전체 항목 수
  totalPages: number;     // 전체 페이지 수
  hasNextPage: boolean;   // 다음 페이지 존재 여부
  hasPreviousPage: boolean; // 이전 페이지 존재 여부
}

/**
 * @class PaginatedResponseDto<T>
 * @description 제네릭 페이지네이션 응답 클래스
 * @template T - 응답 항목의 타입 (예: Spot, Post, Diary 등)
 */
export class PaginatedResponseDto<T> {
  /** 현재 페이지의 데이터 항목 배열 */
  readonly items: T[];
  /** 페이지네이션 메타 정보 */
  readonly meta: PaginationMeta;

  constructor(items: T[], totalItems: number, page: number, limit: number) {
    this.items = items;
    const totalPages = Math.ceil(totalItems / limit);
    this.meta = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * 정적 팩토리 메서드 - PaginatedResponseDto 인스턴스를 생성하는 헬퍼
   * @param items - 현재 페이지 데이터 배열
   * @param totalItems - 전체 항목 수 (DB COUNT 결과)
   * @param page - 현재 페이지 번호
   * @param limit - 한 페이지당 항목 수
   */
  static create<T>(
    items: T[],
    totalItems: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto<T>(items, totalItems, page, limit);
  }
}
