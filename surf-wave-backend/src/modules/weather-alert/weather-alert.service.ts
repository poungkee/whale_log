/**
 * @file weather-alert.service.ts
 * @description 기상청 기상특보 조회 서비스
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 📡 데이터 출처
 *   - 기관: 기상청 (Korea Meteorological Administration)
 *   - API: 기상특보조회서비스 (공공데이터포털)
 *   - URL: http://apis.data.go.kr/1360000/WthrWrnInfoService
 *   - 인증: KMA_WEATHER_ALERT_API_KEY (환경변수)
 *   - 주의: HTTPS 미지원 → HTTP만 사용 가능
 *
 * 📦 제공 데이터
 *   - 현재 발효 중인 기상특보 목록
 *   - 특보 종류: 풍랑, 강풍, 태풍, 호우, 대설 등
 *   - 특보 수준: 주의보 / 경보
 *   - 대상 해역: 강원동해안, 경북동해안, 부산근해, 제주도 등
 *
 * 🏄 서퍼 관련 특보 (중요도 순)
 *   1. 풍랑경보   — 파고 5m 이상, 절대 입수 금지
 *   2. 풍랑주의보 — 파고 3m 이상, 입수 위험
 *   3. 태풍       — 즉시 대피
 *   4. 강풍경보   — 풍속 26m/s 이상
 *   5. 강풍주의보 — 풍속 14m/s 이상
 *
 * 🔄 갱신 주기
 *   - 특보 발령/해제 시 즉시 업데이트 (기상청 측)
 *   - 우리 캐시: 15분마다 갱신 (특보는 빠른 갱신 필요)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

// ────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────

/** 기상청 특보 API 응답 항목 구조 */
export interface KmaAlertItem {
  /** 특보 종류 (풍랑, 강풍, 태풍, 호우, 대설 등) */
  warnVar: string;
  /** 특보 수준 (주의보 / 경보) */
  warnStress: string;
  /** 발표 시각 (YYYYMMDDHHMM) */
  tmFc: string;
  /** 발효 시각 (YYYYMMDDHHMM) */
  tmEf: string;
  /** 특보구역코드 (예: S1131000) */
  areaCode: string;
  /** 특보구역명 (예: 강원동해안바다) */
  areaNm: string;
}

/** 우리 앱에서 사용할 특보 정보 구조 */
export interface SpotWeatherAlert {
  /** 특보 종류 (풍랑 | 강풍 | 태풍 | 없음) */
  type: '풍랑' | '강풍' | '태풍' | '호우' | '대설' | null;
  /** 특보 수준 (주의보 | 경보) */
  level: '주의보' | '경보' | null;
  /** 전체 특보명 (예: "풍랑경보") */
  alertName: string | null;
  /** 특보 발효 시각 */
  issuedAt: string | null;
  /** 위험 여부 (풍랑/강풍/태풍 특보 시 true) */
  isDangerous: boolean;
  /** 서퍼용 경고 메시지 */
  message: string | null;
}

// ────────────────────────────────────────────
// 상수: 서핑 스팟 → 기상청 특보구역 매핑
// ────────────────────────────────────────────

/**
 * 우리 앱 스팟명 → 기상청 특보구역명 매핑
 *
 * 기상청 특보구역명은 해역 단위로 묶임 (예: "강원동해안바다")
 * 한 특보구역에 여러 서핑 스팟이 포함될 수 있음
 *
 * 특보구역코드 참고 (기상청_기상특보조회서비스_오픈API활용가이드):
 *   S1131000: 강원동해안바다
 *   S1131200: 강원북부동해안바다
 *   S1131300: 강원남부동해안바다
 *   S1311200: 경남남해서부바다
 *   S1311300: 경남남해동부바다
 *   S1311400: 경북동해안바다
 *   S1322100: 전남서부남해안바다
 *   S1322200: 전남동부남해안바다
 *   S1151000: 제주도남쪽바다
 *   S1151100: 제주도북쪽바다
 *   S1232200: 충남북부서해안바다
 *   S1232100: 충남남부서해안바다
 */
const SPOT_TO_ALERT_AREA: Record<string, string[]> = {
  // 강원 동해안 (강원동해안바다 전체 또는 북부/남부)
  '양양 죽도해변':   ['강원동해안', '강원북부동해안'],
  '강릉 경포해변':   ['강원동해안', '강원남부동해안'],
  '강릉 금진해변':   ['강원동해안', '강원남부동해안'],
  '동해 망상해변':   ['강원동해안', '강원남부동해안'],
  '고성 송지호해변': ['강원동해안', '강원북부동해안'],

  // 경북 동해안
  '포항 월포해변':   ['경북동해안'],

  // 경남/부산 남해안
  '울산 진하해변':   ['경남남해동부', '경남남해안'],
  '부산 송정해변':   ['경남남해동부', '경남남해안'],
  '부산 다대포해변': ['경남남해서부', '경남남해안'],

  // 전남 남해안
  '고흥 남열해변':   ['전남서부남해안', '전남남해안'],
  '완도 명사십리해변': ['전남동부남해안', '전남남해안'],

  // 제주도
  '제주 중문해변':   ['제주도남쪽', '제주도'],
  '제주 월정리해변': ['제주도북쪽', '제주도'],
  '제주 곽지해변':   ['제주도북쪽', '제주도'],

  // 충남 서해안
  '태안 만리포해변': ['충남북부서해안', '충남서해안'],
};

/**
 * 서퍼에게 위험한 특보 종류
 * 이 특보 발령 시 isDangerous = true, 강한 경고 표시
 */
const DANGEROUS_WARN_TYPES = ['풍랑', '태풍'];

/**
 * 서퍼에게 주의가 필요한 특보 종류
 * isDangerous = false지만 메시지 표시
 */
const CAUTION_WARN_TYPES = ['강풍'];

/**
 * 특보별 서퍼용 경고 메시지
 */
const ALERT_MESSAGES: Record<string, string> = {
  '풍랑경보':   '⛔ 풍랑경보 발령 — 파고 5m 이상, 입수 절대 금지',
  '풍랑주의보': '⚠️ 풍랑주의보 발령 — 파고 3m 이상, 입수 위험',
  '태풍':       '🚨 태풍 특보 발령 — 즉시 대피하세요',
  '강풍경보':   '⚠️ 강풍경보 발령 — 풍속 26m/s 이상, 서핑 위험',
  '강풍주의보': '⚠️ 강풍주의보 발령 — 풍속 14m/s 이상, 주의 필요',
};

// ────────────────────────────────────────────
// 서비스
// ────────────────────────────────────────────

@Injectable()
export class WeatherAlertService {
  private readonly logger = new Logger(WeatherAlertService.name);

  /**
   * 기상청 특보 API 기본 URL
   * 주의: HTTPS 미지원 → HTTP 사용 필수
   */
  private readonly endpoint = 'http://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList';

  private readonly apiKey: string;

  /**
   * 현재 발효 중인 특보 목록 캐시
   * 15분마다 갱신 (특보는 빠른 대응 필요)
   */
  private alertCache: KmaAlertItem[] = [];

  /** 캐시 마지막 갱신 시각 */
  private lastUpdated: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('KMA_WEATHER_ALERT_API_KEY') ?? '';
  }

  // ────────────────────────────────────────────
  // 크론 갱신
  // ────────────────────────────────────────────

  /**
   * 15분마다 특보 캐시 갱신
   * 특보 발령/해제는 빠르게 반영해야 하므로 짧은 주기 사용
   */
  @Cron('*/15 * * * *')
  async refreshAlertCache(): Promise<void> {
    await this.fetchAlerts();
  }

  /** 앱 시작 시 즉시 1회 조회 */
  async onModuleInit(): Promise<void> {
    await this.fetchAlerts();
  }

  // ────────────────────────────────────────────
  // 공개 메서드
  // ────────────────────────────────────────────

  /**
   * 특정 스팟의 현재 기상특보 반환
   *
   * @param spotName - 우리 앱 스팟명 (예: "양양 죽도해변")
   * @returns 해당 스팟의 특보 정보 (특보 없으면 null 필드)
   *
   * 사용 예:
   *   alertService.getSpotAlert('양양 죽도해변')
   *   → { type: '풍랑', level: '주의보', isDangerous: true, message: '⚠️ 풍랑주의보...' }
   */
  getSpotAlert(spotName: string): SpotWeatherAlert {
    /** 스팟에 해당하는 기상청 특보구역 키워드 목록 */
    const areaKeywords = SPOT_TO_ALERT_AREA[spotName];

    if (!areaKeywords) {
      /** 매핑 없는 스팟 (발리 등) — 특보 해당 없음 */
      return this.noAlert();
    }

    /**
     * 현재 발효 중인 특보 중 해당 스팟 구역과 매칭되는 것 찾기
     * 위험도 높은 순으로 정렬 (풍랑경보 > 풍랑주의보 > 강풍경보 > 강풍주의보)
     */
    const matchingAlerts = this.alertCache.filter((alert) =>
      areaKeywords.some((keyword) => alert.areaNm?.includes(keyword)),
    );

    if (!matchingAlerts.length) {
      return this.noAlert();
    }

    /** 우선순위: 풍랑 > 태풍 > 강풍, 경보 > 주의보 */
    const sorted = matchingAlerts.sort((a, b) => {
      const priority = (item: KmaAlertItem) => {
        if (item.warnVar === '태풍') return 100;
        if (item.warnVar === '풍랑' && item.warnStress === '경보') return 90;
        if (item.warnVar === '풍랑' && item.warnStress === '주의보') return 80;
        if (item.warnVar === '강풍' && item.warnStress === '경보') return 60;
        if (item.warnVar === '강풍' && item.warnStress === '주의보') return 50;
        return 10;
      };
      return priority(b) - priority(a);
    });

    const top = sorted[0];
    const alertName = `${top.warnVar}${top.warnStress}`;
    const isDangerous = DANGEROUS_WARN_TYPES.includes(top.warnVar);
    const isCaution = CAUTION_WARN_TYPES.includes(top.warnVar);

    return {
      type:      top.warnVar as SpotWeatherAlert['type'],
      level:     top.warnStress as SpotWeatherAlert['level'],
      alertName,
      issuedAt:  top.tmEf ?? null,
      isDangerous,
      message:   ALERT_MESSAGES[alertName]
                 ?? ALERT_MESSAGES[top.warnVar]
                 ?? (isDangerous || isCaution ? `⚠️ ${alertName} 발령 중` : null),
    };
  }

  /**
   * 현재 전국 발효 중인 특보 전체 목록 반환 (디버깅/관리자용)
   */
  getAllAlerts(): { alerts: KmaAlertItem[]; lastUpdated: Date | null } {
    return { alerts: this.alertCache, lastUpdated: this.lastUpdated };
  }

  /**
   * 서핑 관련 특보만 요약 반환 (프론트엔드 글로벌 배너/모달용)
   *
   * 풍랑/강풍/태풍 특보만 필터링하여 반환
   * 없으면 { hasSurfAlert: false }
   */
  getActiveSurfAlerts(): {
    hasSurfAlert: boolean;
    isDangerous: boolean;
    alerts: Array<{ alertName: string; areaNm: string; level: string; isDangerous: boolean }>;
    lastUpdated: Date | null;
  } {
    const surfAlerts = this.alertCache.filter((a) =>
      [...DANGEROUS_WARN_TYPES, ...CAUTION_WARN_TYPES].includes(a.warnVar),
    );

    if (!surfAlerts.length) {
      return { hasSurfAlert: false, isDangerous: false, alerts: [], lastUpdated: this.lastUpdated };
    }

    const isDangerous = surfAlerts.some((a) => DANGEROUS_WARN_TYPES.includes(a.warnVar));

    return {
      hasSurfAlert: true,
      isDangerous,
      alerts: surfAlerts.map((a) => ({
        alertName:   `${a.warnVar}${a.warnStress}`,
        areaNm:      a.areaNm,
        level:       a.warnStress,
        isDangerous: DANGEROUS_WARN_TYPES.includes(a.warnVar),
      })),
      lastUpdated: this.lastUpdated,
    };
  }

  // ────────────────────────────────────────────
  // 내부: API 호출
  // ────────────────────────────────────────────

  /**
   * 기상청 특보 API 호출 → 캐시 갱신
   *
   * 응답 구조:
   *   response.header.resultCode: "00" (정상) | "03" (NO_DATA = 특보 없음)
   *   response.body.items.item: 특보 항목 배열
   */
  private async fetchAlerts(): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('KMA_WEATHER_ALERT_API_KEY 미설정 — 기상특보 캐시 생략');
      return;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(this.endpoint, {
          params: {
            serviceKey: this.apiKey,
            numOfRows:  100,  // 최대 특보 건수 (전국 동시 특보는 보통 10건 이하)
            pageNo:     1,
            dataType:   'JSON',
          },
        }),
      );

      const resultCode: string = response.data?.response?.header?.resultCode ?? '';

      if (resultCode === '03') {
        /** NO_DATA: 현재 발효 중인 특보 없음 (정상 상태) */
        this.alertCache = [];
        this.lastUpdated = new Date();
        this.logger.log('기상특보 없음 (현재 전국 특보 미발령)');
        return;
      }

      if (resultCode !== '00') {
        this.logger.warn(`기상청 특보 API 오류: resultCode=${resultCode}`);
        return;
      }

      const items = response.data?.response?.body?.items?.item ?? [];
      /** 단일 항목도 배열로 통일 처리 */
      this.alertCache = Array.isArray(items) ? items : [items];
      this.lastUpdated = new Date();

      /** 서핑 관련 특보(풍랑/강풍/태풍)만 필터해서 로그 출력 */
      const surfAlerts = this.alertCache.filter((a) =>
        [...DANGEROUS_WARN_TYPES, ...CAUTION_WARN_TYPES].includes(a.warnVar),
      );

      if (surfAlerts.length > 0) {
        this.logger.warn(
          `서핑 관련 특보 발령 중: ${surfAlerts.map((a) => `${a.areaNm} ${a.warnVar}${a.warnStress}`).join(', ')}`,
        );
      } else {
        this.logger.log(`기상특보 캐시 갱신 완료: 총 ${this.alertCache.length}건 (서핑 관련 없음)`);
      }

    } catch (error) {
      this.logger.error(`기상청 특보 API 호출 실패: ${error}`);
    }
  }

  /** 특보 없음 기본값 반환 */
  private noAlert(): SpotWeatherAlert {
    return {
      type:        null,
      level:       null,
      alertName:   null,
      issuedAt:    null,
      isDangerous: false,
      message:     null,
    };
  }
}
