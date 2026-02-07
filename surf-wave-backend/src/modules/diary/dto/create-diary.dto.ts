/**
 * @file create-diary.dto.ts
 * @description 다이어리 생성 요청 DTO - 서핑 날짜, 스팟, 보드종류, 파도상태, 감상 등
 */
import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoardType } from '../../../common/enums/board-type.enum';
import { Visibility } from '../../../common/enums/visibility.enum';

export class CreateDiaryDto {
  @ApiProperty({ description: 'Spot ID' })
  @IsUUID()
  spotId: string;

  @ApiProperty({ description: 'Surf date (YYYY-MM-DD)' })
  @IsDateString()
  surfDate: string;

  @ApiProperty({ enum: BoardType })
  @IsEnum(BoardType)
  boardType: BoardType;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ description: 'Satisfaction rating (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  satisfaction: number;

  @ApiPropertyOptional({ description: 'Memo/notes' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ enum: Visibility, default: Visibility.PRIVATE })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({ description: 'Image URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
