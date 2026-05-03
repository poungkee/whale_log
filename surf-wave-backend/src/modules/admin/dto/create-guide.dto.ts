/**
 * @file create-guide.dto.ts
 * @description 가이드 생성 DTO (관리자) - 제목, 내용, 카테고리, 난이도
 */
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuideCategory } from '../../../common/enums/guide-category.enum';

export class CreateGuideDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Markdown content' })
  @IsString()
  content: string;

  @ApiProperty({ enum: GuideCategory })
  @IsEnum(GuideCategory)
  category: GuideCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  estimatedReadMinutes: number;

  /** 공개 여부 — 체크 해제 시 사용자에게 안 보임 (기본값 true) */
  @ApiPropertyOptional({ description: '공개 여부 (default: true)' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
