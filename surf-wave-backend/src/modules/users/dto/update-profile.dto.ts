/**
 * @file update-profile.dto.ts
 * @description 프로필 수정 요청 DTO
 *
 * PATCH /users/me 엔드포인트에서 사용됩니다.
 * 모든 필드가 선택적(optional)이므로 변경하고 싶은 필드만 전달하면 됩니다.
 */
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  /** 닉네임 변경 (2~30자) */
  @ApiPropertyOptional({ minLength: 2, maxLength: 30 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  surfLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
