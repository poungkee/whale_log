/**
 * @file question-query.dto.ts
 * @description 질문 목록 조회 쿼리 DTO - 검색/정렬/태그 필터
 */
import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class QuestionQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: ['latest', 'popular', 'unanswered'] })
  @IsOptional()
  @IsIn(['latest', 'popular', 'unanswered'])
  sort?: 'latest' | 'popular' | 'unanswered';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
