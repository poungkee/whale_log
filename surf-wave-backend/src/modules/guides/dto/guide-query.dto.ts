/**
 * @file guide-query.dto.ts
 * @description 가이드 조회 쿼리 DTO - 카테고리/난이도 필터 + 페이지네이션
 */
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuideCategory } from '../../../common/enums/guide-category.enum';

export class GuideQueryDto {
  @ApiPropertyOptional({ enum: GuideCategory })
  @IsOptional()
  @IsEnum(GuideCategory)
  category?: GuideCategory;
}
