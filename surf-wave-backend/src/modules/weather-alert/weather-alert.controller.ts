/**
 * @file weather-alert.controller.ts
 * @description 기상특보 조회 컨트롤러
 *
 * 관리자/디버깅용 엔드포인트 제공
 * 실제 서퍼 앱에서는 대시보드 API에 통합되어 반환됨
 */

import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { WeatherAlertService, SpotWeatherAlert } from './weather-alert.service';

@Controller('weather-alerts')
export class WeatherAlertController {
  constructor(private readonly weatherAlertService: WeatherAlertService) {}

  /**
   * GET /weather-alerts
   * 현재 전국 발효 중인 기상특보 전체 조회 (디버깅/관리자용)
   * @Public — 인증 없이 접근 가능
   */
  @Public()
  @Get()
  getAllAlerts() {
    return this.weatherAlertService.getAllAlerts();
  }

  /**
   * GET /weather-alerts/surf
   * 현재 발효 중인 특보 중 서핑 관련(풍랑/강풍/태풍)만 요약 반환
   * 프론트엔드 글로벌 배너/모달에서 사용
   */
  @Public()
  @Get('surf')
  getSurfAlerts() {
    return this.weatherAlertService.getActiveSurfAlerts();
  }

  /**
   * GET /weather-alerts/mock?type=풍랑&level=경보
   * 특보 UI 테스트용 mock 엔드포인트 (개발/QA 전용)
   *
   * 사용 예:
   *   /weather-alerts/mock?type=풍랑&level=경보   → 빨간 경고 (입수 금지)
   *   /weather-alerts/mock?type=풍랑&level=주의보 → 주황 경고 (입수 위험)
   *   /weather-alerts/mock?type=강풍&level=주의보 → 주황 주의
   *   /weather-alerts/mock?type=태풍             → 빨간 위험 (태풍)
   *   /weather-alerts/mock                       → 특보 없음 (정상 상태)
   */
  @Public()
  @Get('mock')
  getMockAlert(
    @Query('type') type?: string,
    @Query('level') level?: string,
  ): SpotWeatherAlert {
    /** 파라미터 없으면 특보 없음 상태 반환 */
    if (!type) {
      return {
        type:        null,
        level:       null,
        alertName:   null,
        issuedAt:    null,
        isDangerous: false,
        message:     null,
      };
    }

    const alertLevel = (level ?? '주의보') as '주의보' | '경보';
    const alertType = type as SpotWeatherAlert['type'];
    const alertName = `${type}${alertLevel}`;
    const isDangerous = type === '풍랑' || type === '태풍';

    const messages: Record<string, string> = {
      '풍랑경보':   '⛔ 풍랑경보 발령 — 파고 5m 이상, 입수 절대 금지',
      '풍랑주의보': '⚠️ 풍랑주의보 발령 — 파고 3m 이상, 입수 위험',
      '태풍주의보': '🚨 태풍 특보 발령 — 즉시 대피하세요',
      '태풍경보':   '🚨 태풍 특보 발령 — 즉시 대피하세요',
      '강풍경보':   '⚠️ 강풍경보 발령 — 풍속 26m/s 이상, 서핑 위험',
      '강풍주의보': '⚠️ 강풍주의보 발령 — 풍속 14m/s 이상, 주의 필요',
    };

    return {
      type:        alertType,
      level:       alertLevel,
      alertName,
      issuedAt:    new Date().toISOString(),
      isDangerous,
      message:     messages[alertName] ?? `⚠️ ${alertName} 발령 중`,
    };
  }
}
