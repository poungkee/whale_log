/**
 * @file webcam.service.ts
 * @description Windy 웹캠 API 프록시 서비스
 *
 * Windy Webcams API v3를 호출하여 특정 좌표 근처의 해변 스냅샷 이미지 URL을 반환
 * - 스팟 좌표(위도/경도) 기반으로 반경 30km 이내 웹캠 자동 탐색
 * - API 키를 백엔드에서 관리 (프론트엔드에 노출 방지)
 * - 이미지 URL은 10분 후 만료 (free tier) → 프론트에서 주기적으로 재호출 필요
 * - @Public() 엔드포인트이므로 JWT 인증 없이 호출 가능
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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

/** Windy API 응답 전체 구조 */
interface WindyApiResponse {
  webcams: WindyWebcam[];
  total?: number;
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

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.windyApiKey = this.configService.get<string>('WINDY_API_KEY') ?? '';
  }

  /**
   * 스팟 좌표 기반 근처 웹캠 스냅샷 이미지 URL 반환
   * @param lat - 위도 (예: -8.69)
   * @param lng - 경도 (예: 115.16)
   * 반경 30km 이내 웹캠을 탐색하여 첫 번째 결과 반환
   */
  async getSnapshotByLocation(lat: number, lng: number): Promise<WebcamSnapshot> {
    if (!this.windyApiKey) {
      throw new NotFoundException('Windy API 키가 설정되지 않았습니다.');
    }

    // nearby 파라미터: lat,lng,radius(km)
    const url = `${this.windyBaseUrl}/webcams?nearby=${lat},${lng},30&include=images&limit=1`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<WindyApiResponse>(url, {
          headers: {
            'x-windy-api-key': this.windyApiKey,
          },
        }),
      );

      const webcam = response.data.webcams?.[0];

      if (!webcam) {
        throw new NotFoundException(`위치(${lat}, ${lng}) 근처에 웹캠이 없습니다.`);
      }

      /** preview 이미지 우선, 없으면 medium 사용 */
      const imageUrl =
        webcam.images?.current?.preview ??
        webcam.images?.sizes?.medium?.preview ??
        '';

      if (!imageUrl) {
        throw new NotFoundException(`웹캠 이미지 URL을 가져올 수 없습니다.`);
      }

      this.logger.log(`웹캠 스냅샷 조회 성공: ${webcam.title} (${lat}, ${lng})`);

      return {
        title: webcam.title,
        imageUrl,
        expiresInSeconds: 600, // free tier: 10분 만료
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const axiosError = error as any;
      const status = axiosError?.response?.status;
      const detail = axiosError?.response?.data ?? axiosError?.message ?? String(error);
      this.logger.error(`Windy API 호출 실패 [${status}]: ${JSON.stringify(detail)}`);
      throw new NotFoundException(`이 스팟 근처에 웹캠이 없습니다.`);
    }
  }
}
