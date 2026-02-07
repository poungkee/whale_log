/**
 * @file pagination.dto.ts
 * @description 페이지네이션 요청 DTO (Data Transfer Object)
 *
 * 목록 조회 API에서 공통으로 사용되는 페이지네이션 파라미터를 정의합니다.
 * 다른 쿼리 DTO에서 이 클래스를 상속(extends)하여 사용합니다.
 *
 * @example
 * GET /api/v1/spots?page=2&limit=10 → 2페이지, 10개씩 조회
 */

import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PAGINATION } from '../constants/app.constants';

/**
 * @class PaginationDto
 * @description 페이지네이션 쿼리 파라미터 DTO
 *
 * 클라이언트에서 page와 limit을 쿼리 파라미터로 전달하여 원하는 페이지의 데이터를 조회합니다.
 */
export class PaginationDto {
  /** 조회할 페이지 번호 (기본값: 1, 최소값: 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PAGINATION.DEFAULT_PAGE;

  /** 한 페이지당 조회할 항목 수 (기본값: 20, 최소: 1, 최대: 100) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit: number = PAGINATION.DEFAULT_LIMIT;

  /**
   * DB 쿼리에서 사용할 offset(건너뛸 항목 수)을 계산하는 getter
   * 예: page=3, limit=20 → skip = (3-1) * 20 = 40 (앞 40개 건너뛰기)
   */
  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
