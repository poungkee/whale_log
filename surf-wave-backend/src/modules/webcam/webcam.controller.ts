/**
 * @file webcam.controller.ts
 * @description Windy 웹캠 프록시 컨트롤러
 *
 * @endpoints
 * - GET /webcam/nearby?lat=X&lng=Y - 좌표 근처 웹캠 스냅샷 URL 반환 (@Public)
 */

import { Controller, Get, Query, ParseFloatPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WebcamService, WebcamSnapshot } from './webcam.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('webcam')
@Controller('webcam')
export class WebcamController {
  constructor(private readonly webcamService: WebcamService) {}

  /**
   * 스팟 좌표 기반 근처 웹캠 스냅샷 이미지 URL 조회
   * - 반경 30km 이내 Windy 웹캠 자동 탐색
   * - 프론트엔드에서 <img> 태그에 사용할 URL을 반환
   * - API 키는 백엔드에서 관리 (보안)
   * - 이미지 URL은 10분 후 만료 → 프론트에서 9분마다 재호출
   */
  @Get('nearby')
  @Public()
  @ApiOperation({ summary: '좌표 근처 Windy 웹캠 스냅샷 URL 조회' })
  @ApiQuery({ name: 'lat', type: Number, description: '위도 (예: -8.69)' })
  @ApiQuery({ name: 'lng', type: Number, description: '경도 (예: 115.16)' })
  async getNearbySnapshot(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
  ): Promise<WebcamSnapshot> {
    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('lat, lng 파라미터가 필요합니다.');
    }
    return this.webcamService.getSnapshotByLocation(lat, lng);
  }
}
