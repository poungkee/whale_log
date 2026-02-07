/**
 * @file update-question.dto.ts
 * @description 질문 수정 요청 DTO
 */
import { PartialType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}
