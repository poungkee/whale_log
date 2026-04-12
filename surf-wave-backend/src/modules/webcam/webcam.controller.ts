/**
 * @file webcam.controller.ts
 * @description Windy 웹캠 프록시 컨트롤러
 *
 * @endpoints
 * - GET /webcam/:webcamId - 특정 Windy 웹캠의 현재 스냅샷 URL 반환 (@Public)
 */

import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebcamService, WebcamSnapshot } from './webcam.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('webcam')
@Controller('webcam')
export class WebcamController {
  constructor(private readonly webcamService: WebcamService) {}

  /**
   * Windy 웹캠 현재 스냅샷 이미지 URL 조회
   * - 프론트엔드에서 <img> 태그에 사용할 URL을 반환
   * - API 키는 백엔드에서 관리 (보안)
   * - 이미지 URL은 10분 후 만료 → 프론트에서 9분마다 재호출
   */
  @Get(':webcamId')
  @Public()
  @ApiOperation({ summary: 'Windy 웹캠 스냅샷 URL 조회' })
  async getSnapshot(@Param('webcamId') webcamId: string): Promise<WebcamSnapshot> {
    return this.webcamService.getSnapshot(webcamId);
  }
}
