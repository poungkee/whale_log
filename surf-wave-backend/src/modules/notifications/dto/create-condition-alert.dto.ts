/**
 * @file create-condition-alert.dto.ts
 * @description 파도 조건 알림 생성 DTO - 스팟, 최소 파고, 최대 풍속 등 조건 설정
 */
import { IsUUID, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConditionAlertDto {
  @ApiProperty()
  @IsUUID()
  spotId: string;

  @ApiPropertyOptional({ description: 'Minimum wave height in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minWaveHeight?: number;

  @ApiPropertyOptional({ description: 'Maximum wind speed in km/h' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWindSpeed?: number;
}
