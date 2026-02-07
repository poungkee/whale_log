/**
 * @file broadcast.dto.ts
 * @description 전체 공지 알림 DTO (관리자) - 공지 제목, 내용
 */
import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BroadcastDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
