/**
 * @file update-answer.dto.ts
 * @description 답변 수정 요청 DTO
 */
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAnswerDto {
  @ApiProperty()
  @IsString()
  content: string;
}
