/**
 * @file forecast-query.dto.ts
 * @description 예보 조회 쿼리 DTO - 날짜 범위, 스팟 ID 등 필터
 */
import { IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ForecastQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Number of hours to fetch', default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168) // 7 days
  hours?: number;
}
