/**
 * @file agree-terms.dto.ts
 * @description 약관 동의 요청 DTO - 동의할 약관 ID 목록
 */
import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AgreeTermsDto {
  @ApiProperty({ type: [String], description: 'List of terms IDs to agree' })
  @IsArray()
  @IsUUID('4', { each: true })
  termsIds: string[];
}
