/**
 * @file post-query.dto.ts
 * @description 게시글 목록 조회 쿼리 DTO - 정렬, 검색 + 페이지네이션
 */
import { IsOptional, IsString, IsUUID, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class PostQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  spotId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ enum: ['latest', 'popular'] })
  @IsOptional()
  @IsIn(['latest', 'popular'])
  sort?: 'latest' | 'popular';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
