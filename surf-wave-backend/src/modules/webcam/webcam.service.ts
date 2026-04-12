/**
 * @file webcam.service.ts
 * @description Windy 웹캠 API 프록시 서비스
 *
 * Windy Webcams API v3를 호출하여 특정 스팟의 현재 해변 스냅샷 이미지 URL을 반환
 * - API 키를 백엔드에서 관리 (프론트엔드에 노출 방지)
 * - 이미지 URL은 10분 후 만료 (free tier) → 프론트에서 주기적으로 재호출 필요
 * - @Public() 엔드포인트이므로 JWT 인증 없이 호출 가능
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Windy API 이미지 응답 구조 */
interface WindyImageSet {
  preview: string;   // 소형 미리보기 이미지 URL (400x300)
  full?: string;     // 전체 해상도 이미지 URL (토큰 포함, 10분 만료)
}

/** Windy API 웹캠 항목 구조 */
interface WindyWebcam {
  webcamId: string;
  title: string;
  images?: {
    current?: WindyImageSet;
    sizes?: {
      medium?: WindyImageSet;
    };
  };
}

/** 프론트엔드에 반환하는 웹캠 정보 */
export interface WebcamSnapshot {
  /** 웹캠 스팟 이름 */
  title: string;
  /** 현재 해변 스냅샷 이미지 URL */
  imageUrl: string;
  /** 이미지 만료까지 남은 초 (free tier: ~600초) */
  expiresInSeconds: number;
}

@Injectable()
export class WebcamService {
  private readonly logger = new Logger(WebcamService.name);
  private readonly windyApiKey: string;
  private readonly windyBaseUrl = 'https://api.windy.com/webcams/api/v3';

  constructor(private readonly configService: ConfigService) {
    this.windyApiKey = this.configService.get<string>('WINDY_API_KEY') ?? '';
  }

  /**
   * Windy 웹캠 현재 스냅샷 이미지 URL 반환
   * @param webcamId - Windy 웹캠 숫자 ID (예: 1503785462)
   */
  async getSnapshot(webcamId: string): Promise<WebcamSnapshot> {
    if (!this.windyApiKey) {
      throw new NotFoundException('Windy API 키가 설정되지 않았습니다.');
    }

    const url = `${this.windyBaseUrl}/webcams/${webcamId}?include=images`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-windy-api-key': this.windyApiKey,
        },
      });

      if (!response.ok) {
        this.logger.warn(`Windy API 오류 [${response.status}]: webcamId=${webcamId}`);
        throw new NotFoundException(`웹캠 ID ${webcamId}를 찾을 수 없습니다.`);
      }

      const data = await response.json() as { webcams: WindyWebcam[] };
      const webcam = data.webcams?.[0];

      if (!webcam) {
        throw new NotFoundException(`웹캠 ID ${webcamId} 응답이 비어있습니다.`);
      }

      /** preview 이미지 우선, 없으면 medium 사용 */
      const imageUrl =
        webcam.images?.current?.preview ??
        webcam.images?.sizes?.medium?.preview ??
        '';

      if (!imageUrl) {
        throw new NotFoundException(`웹캠 ID ${webcamId} 이미지 URL을 가져올 수 없습니다.`);
      }

      this.logger.log(`웹캠 스냅샷 조회 성공: ${webcam.title}`);

      return {
        title: webcam.title,
        imageUrl,
        expiresInSeconds: 600, // free tier: 10분 만료
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Windy API 호출 실패: ${error}`);
      throw new NotFoundException('웹캠 데이터를 가져오는 데 실패했습니다.');
    }
  }
}
