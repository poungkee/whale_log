/**
 * @file spot-query.dto.ts
 * @description 스팟 목록 조회 쿼리 DTO
 * GET /spots?region=제주&difficulty=BEGINNER&search=중문&page=1&limit=20
 * PaginationDto를 상속하여 페이지네이션 + 필터 기능을 결합합니다.
 */
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { Difficulty } from '../../../common/enums/difficulty.enum';

export class SpotQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
