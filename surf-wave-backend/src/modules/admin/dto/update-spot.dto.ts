/**
 * @file update-spot.dto.ts
 * @description 스팟 수정 DTO (관리자)
 */
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSpotDto } from './create-spot.dto';

export class UpdateSpotDto extends PartialType(CreateSpotDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
