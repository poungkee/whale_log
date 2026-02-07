/**
 * @file presigned-url.dto.ts
 * @description Presigned URL 요청 DTO - 파일명, MIME 타입, 업로드 용도
 */
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'File content type', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
