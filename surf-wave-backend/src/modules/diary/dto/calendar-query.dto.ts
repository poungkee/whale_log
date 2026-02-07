/**
 * @file calendar-query.dto.ts
 * @description 캘린더 조회 쿼리 DTO - 연/월 기준 서핑 기록 조회
 */
import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalendarQueryDto {
  @ApiProperty({ description: 'Year', example: 2024 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @ApiProperty({ description: 'Month (1-12)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
