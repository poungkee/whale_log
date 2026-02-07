/**
 * @file suspend-user.dto.ts
 * @description 사용자 정지 DTO (관리자) - 정지 사유, 기간
 */
import { IsBoolean, IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty()
  @IsBoolean()
  isSuspended: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  suspendedUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
