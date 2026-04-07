/**
 * @file spot-query.dto.ts
 * @description 스팟 목록 조회 쿼리 DTO
 * GET /spots?region=제주&difficulty=BEGINNER&search=중문&page=1&limit=20
 * PaginationDto를 상속하여 페이지네이션 + 필터 기능을 결합합니다.
 */
import { IsOptional, IsString, IsEnum, IsInt, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { Difficulty } from '../../../common/enums/difficulty.enum';

export class SpotQueryDto extends PaginationDto {
  /**
   * 스팟 목록은 전체 조회가 필요한 경우가 많아 limit를 200까지 허용
   * (다이어리/소통 글 작성 시 스팟 선택 드롭다운에서 전체 스팟 필요)
   */
  @ApiPropertyOptional({ description: '한 페이지당 항목 수 (최대 200)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  override limit: number = 20;
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
