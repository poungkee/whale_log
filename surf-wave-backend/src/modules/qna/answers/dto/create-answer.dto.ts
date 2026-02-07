/**
 * @file create-answer.dto.ts
 * @description 답변 생성 요청 DTO - 답변 내용
 */
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnswerDto {
  @ApiProperty()
  @IsString()
  content: string;
}
