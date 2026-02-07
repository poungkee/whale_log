/**
 * @file update-diary.dto.ts
 * @description 다이어리 수정 요청 DTO - 모든 필드 선택적 수정
 */
import { PartialType } from '@nestjs/swagger';
import { CreateDiaryDto } from './create-diary.dto';
import { OmitType } from '@nestjs/mapped-types';

export class UpdateDiaryDto extends PartialType(
  OmitType(CreateDiaryDto, ['spotId', 'surfDate'] as const),
) {}
