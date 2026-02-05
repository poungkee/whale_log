import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuideCategory } from '../../../common/enums/guide-category.enum';

export class GuideQueryDto {
  @ApiPropertyOptional({ enum: GuideCategory })
  @IsOptional()
  @IsEnum(GuideCategory)
  category?: GuideCategory;
}
