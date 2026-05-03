/**
 * @file guide-query.dto.ts
 * @description 가이드 조회 쿼리 DTO - 카테고리 필터 + 페이지네이션
 */
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuideCategory } from '../../../common/enums/guide-category.enum';

export class GuideQueryDto {
  @ApiPropertyOptional({ enum: GuideCategory })
  @IsOptional()
  @IsEnum(GuideCategory)
  category?: GuideCategory;

  /** 페이지 번호 (1부터 시작) */
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** 페이지당 항목 수 (최대 200) */
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
