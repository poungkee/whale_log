/**
 * @file nearby-query.dto.ts
 * @description 주변 스팟 검색 쿼리 DTO
 * GET /spots/nearby?lat=33.5&lng=126.5&radius=30
 * 사용자 위치(위도/경도)와 검색 반경(km)으로 주변 서핑 스팟을 검색합니다.
 */
import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NearbyQueryDto {
  @ApiProperty({ description: 'Latitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ description: 'Radius in km', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  radius?: number;
}
