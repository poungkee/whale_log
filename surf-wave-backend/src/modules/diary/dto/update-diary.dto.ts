import { PartialType } from '@nestjs/swagger';
import { CreateDiaryDto } from './create-diary.dto';
import { OmitType } from '@nestjs/mapped-types';

export class UpdateDiaryDto extends PartialType(
  OmitType(CreateDiaryDto, ['spotId', 'surfDate'] as const),
) {}
