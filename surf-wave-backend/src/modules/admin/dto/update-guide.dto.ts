/**
 * @file update-guide.dto.ts
 * @description 가이드 수정 DTO (관리자)
 */
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateGuideDto } from './create-guide.dto';

export class UpdateGuideDto extends PartialType(CreateGuideDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
