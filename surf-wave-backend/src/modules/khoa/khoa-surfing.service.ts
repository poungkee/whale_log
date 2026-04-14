/**
 * @file khoa-surfing.service.ts
 * @description 해양수산부 국립해양조사원(KHOA) 서핑지수 API 연동 서비스
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 📡 데이터 출처
 *   - 기관: 해양수산부 국립해양조사원 (KHOA)
 *   - API: 서핑지수 조회 (공공데이터포털 15142490)
 *   - URL: https://apis.data.go.kr/1192136/fcstSurfingv2/GetFcstSurfingApiServicev2
 *   - 인증: KHOA_SURFING_API_KEY (환경변수)
 *
 * 📦 제공 데이터
 *   - 서핑 스팟 16곳 (한국 서핑 해수욕장)
 *   - 파고(avgWvhgt), 파주기(avgWvpd), 풍속(avgWspd), 수온(avgWtem)
 *   - 레벨별 서핑지수(totalIndex): 초급/중급/상급 × 5단계(매우좋음/좋음/보통/나쁨/매우나쁨)
 *   - 오전/오후 구분, 7일 예측 제공
 *
 * 🔄 갱신 주기
 *   - 앱 시작 시 1회 즉시 조회
 *   - 이후 1시간마다 자동 갱신 (크론)
 *   - 메모리 캐시에 저장 (DB 저장 없음 - KHOA 데이터는 참조용)
 *
 * 🤝 Open-Meteo와의 관계
 *   - Open-Meteo: 전 세계 예보 (발리 포함), offshore(근해) 모델 기반
 *   - KHOA: 한국 연안 특화 실측값 기반 서핑지수, 더 정확함
 *   - 한국 스팟에서는 KHOA 지수를 추가로 제공하여 교차검증 가능
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Difficulty } from '../../common/enums/difficulty.enum';
import { KhoaData } from './entities/khoa-data.entity';
import { Spot } from '../spots/entities/spot.entity';

// ────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────

/** KHOA API 단일 응답 항목 구조 */
interface KhoaApiItem {
  surfPlcNm: string;    // 서핑 장소명 (예: "죽도해수욕장")
  lat: number;           // 위도
  lot: number;           // 경도
  predcYmd: string;      // 예측 날짜 (YYYY-MM-DD)
  predcNoonSeCd: string; // 오전/오후 구분
  avgWvhgt: string;      // 평균 파고 (m)
  avgWvpd: string;       // 평균 파주기 (s)
  avgWspd: string;       // 평균 풍속 (m/s)
  avgWtem: string;       // 평균 수온 (°C)
  grdCn: string;         // 레벨 구분 (초급/중급/상급)
  totalIndex: string;    // 서핑지수 (매우좋음/좋음/보통/나쁨/매우나쁨)
}

/** 레벨별 서핑지수 (오전/오후) */
interface KhoaLevelIndex {
  /** 초급자 서핑지수 */
  beginner: string;
  /** 중급자 서핑지수 */
  intermediate: string;
  /** 상급자 서핑지수 */
  advanced: string;
}

/** 단일 시간대(오전 또는 오후) 서핑 데이터 */
interface KhoaTimeSlot {
  /** 레벨별 서핑지수 */
  levelIndex: KhoaLevelIndex;
  /** 파고 (m) - KHOA 연안 보정값 */
  waveHeight: number;
  /** 파주기 (s) */
  wavePeriod: number;
  /** 풍속 (m/s) */
  windSpeed: number;
  /** 수온 (°C) */
  waterTemperature: number;
}

/** 스팟별 오늘 서핑 데이터 (오전/오후) */
export interface KhoaSpotData {
  /** 스팟명 (KHOA 기준) */
  khoaName: string;
  /** 오전 데이터 */
  am: KhoaTimeSlot | null;
  /** 오후 데이터 */
  pm: KhoaTimeSlot | null;
  /** 현재 시간대에 맞는 데이터 (오전 12시 이전이면 am, 이후면 pm) */
  current: KhoaTimeSlot | null;
  /** 마지막 갱신 시각 */
  updatedAt: Date;
}

/** 대시보드에 추가되는 KHOA 보강 데이터 */
export interface KhoaEnrichment {
  /** 현재 레벨에 맞는 서핑지수 (매우좋음/좋음/보통/나쁨/매우나쁨 | null) */
  khoaIndex: string | null;
  /** KHOA 파고 (연안 보정, Open-Meteo보다 정확) */
  khoaWaveHeight: number | null;
  /** KHOA 수온 */
  khoaWaterTemperature: number | null;
  /** KHOA 풍속 (m/s) */
  khoaWindSpeed: number | null;
  /** KHOA 파주기 */
  khoaWavePeriod: number | null;
  /**
   * Open-Meteo 파고 대비 KHOA 파고 비율
   * 예: 1.6 → KHOA가 60% 더 높음 (연안 보정 반영)
   */
  waveHeightRatio: number | null;
}

// ────────────────────────────────────────────
// 상수: 스팟명 매핑 (우리 DB명 → KHOA 공식명)
// ────────────────────────────────────────────

/**
 * 우리 앱 스팟명 → KHOA API 스팟명 매핑 테이블
 *
 * 총 9개 스팟 매핑:
 *   한국 동해: 죽도, 경포, 망상, 금진, 월포, 송지호
 *   한국 남해/서해: 송정(부산), 다대포, 남열, 만리포
 *   제주: 중문, 월정리, 곽지
 *
 * KHOA에는 있지만 우리 DB에 없는 스팟 (참고):
 *   명사십리해수욕장(완도), 송정솔바람해수욕장(거제), 진하해수욕장(울산)
 */
const OUR_NAME_TO_KHOA: Record<string, string> = {
  // 강원 동해
  '양양 죽도해변':   '죽도해수욕장',
  '강릉 경포해변':   '경포해수욕장',
  '강릉 금진해변':   '금진해수욕장',
  '동해 망상해변':   '망상해수욕장',
  '고성 송지호해변': '송지호해수욕장',
  // 경상
  '포항 월포해변':   '월포해수욕장',
  '울산 진하해변':   '진하해수욕장',
  '부산 송정해변':   '송정해수욕장',
  '부산 다대포해변': '다대포해수욕장',
  // 전남
  '고흥 남열해변':   '남열해수욕장',
  '완도 명사십리해변': '명사십리해수욕장',
  // 제주
  '제주 중문해변':   '중문색달해수욕장',
  '제주 월정리해변': '월정리해수욕장',
  '제주 곽지해변':   '곽지해수욕장',
  // 충남
  '태안 만리포해변': '만리포해수욕장',
};

/**
 * 우리 앱 난이도(Difficulty) → KHOA 레벨명 매핑
 * EXPERT는 KHOA에 없으므로 상급으로 처리
 */
const DIFFICULTY_TO_KHOA_LEVEL: Record<Difficulty, keyof KhoaLevelIndex> = {
  [Difficulty.BEGINNER]:     'beginner',
  [Difficulty.INTERMEDIATE]: 'intermediate',
  [Difficulty.ADVANCED]:     'advanced',
  [Difficulty.EXPERT]:       'advanced', // KHOA에 expert 없음 → 상급
};

// ────────────────────────────────────────────
// 서비스
// ────────────────────────────────────────────

@Injectable()
export class KhoaSurfingService {
  private readonly logger = new Logger(KhoaSurfingService.name);
  private readonly apiKey: string;
  private readonly endpoint =
    'https://apis.data.go.kr/1192136/fcstSurfingv2/GetFcstSurfingApiServicev2';

  /**
   * 메모리 캐시: KHOA 스팟명 → 오늘 서핑 데이터
   * (빠른 조회를 위해 캐시 유지 + DB에도 히스토리 저장)
   */
  private cache = new Map<string, KhoaSpotData>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(KhoaData)
    private readonly khoaDataRepo: Repository<KhoaData>,
    @InjectRepository(Spot)
    private readonly spotRepo: Repository<Spot>,
  ) {
    this.apiKey = this.configService.get<string>('KHOA_SURFING_API_KEY') ?? '';
  }

  // ────────────────────────────────────────────
  // 크론 갱신
  // ────────────────────────────────────────────

  /**
   * 매 시간 정각에 KHOA 서핑지수 갱신
   * KHOA API는 하루 2회(오전/오후) 예보를 갱신하므로 1시간 주기면 충분
   */
  @Cron('0 * * * *')
  async refreshCache() {
    await this.fetchAndCache();
  }

  /**
   * 앱 시작 시 즉시 1회 조회 (크론 첫 실행 대기 없이 즉시 제공)
   * NestJS OnModuleInit으로 처리하는 것과 동일한 효과
   */
  async onModuleInit() {
    await this.fetchAndCache();
  }

  // ────────────────────────────────────────────
  // 공개 메서드
  // ────────────────────────────────────────────

  /**
   * 특정 스팟의 현재 KHOA 서핑지수 반환
   *
   * @param ourSpotName - 우리 앱 스팟명 (예: "양양 죽도해변")
   * @param level - 사용자 레벨 (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
   * @returns KHOA 보강 데이터 (매핑 없거나 캐시 미스 시 null 필드)
   *
   * 사용 예:
   *   khoaService.getEnrichment('양양 죽도해변', Difficulty.BEGINNER)
   *   → { khoaIndex: '매우좋음', khoaWaveHeight: 0.6, ... }
   */
  getEnrichment(ourSpotName: string, level?: Difficulty, openMeteoWaveHeight?: number): KhoaEnrichment {
    /** 우리 스팟명 → KHOA 스팟명 변환 */
    const khoaName = OUR_NAME_TO_KHOA[ourSpotName];

    if (!khoaName) {
      /** 매핑 없는 스팟 (발리, 한국 비매핑 스팟) - KHOA 데이터 없음 */
      return { khoaIndex: null, khoaWaveHeight: null, khoaWaterTemperature: null, khoaWindSpeed: null, khoaWavePeriod: null, waveHeightRatio: null };
    }

    const spotData = this.cache.get(khoaName);
    if (!spotData?.current) {
      /** 캐시 미스 (API 미호출 또는 네트워크 오류) */
      return { khoaIndex: null, khoaWaveHeight: null, khoaWaterTemperature: null, khoaWindSpeed: null, khoaWavePeriod: null, waveHeightRatio: null };
    }

    /** 사용자 레벨에 맞는 KHOA 서핑지수 선택 */
    const levelKey = level ? DIFFICULTY_TO_KHOA_LEVEL[level] : 'beginner';
    const khoaIndex = spotData.current.levelIndex[levelKey] ?? null;

    /**
     * 파고 비율 계산 (Open-Meteo 대비 KHOA 보정치)
     * - Open-Meteo: offshore 모델 → 실제보다 1.5~2배 낮게 나오는 경향
     * - KHOA: 연안 실측 기반 → 더 정확
     * - ratio > 1이면 KHOA가 더 높음 (연안 쇄파 증폭 반영)
     */
    const waveHeightRatio =
      openMeteoWaveHeight && openMeteoWaveHeight > 0
        ? Math.round((spotData.current.waveHeight / openMeteoWaveHeight) * 100) / 100
        : null;

    return {
      khoaIndex,
      khoaWaveHeight:        spotData.current.waveHeight,
      khoaWaterTemperature:  spotData.current.waterTemperature,
      khoaWindSpeed:         spotData.current.windSpeed,
      khoaWavePeriod:        spotData.current.wavePeriod,
      waveHeightRatio,
    };
  }

  /**
   * 캐시된 전체 스팟 데이터 반환 (교차검증/디버깅용)
   */
  getAllCachedData(): Record<string, KhoaSpotData> {
    return Object.fromEntries(this.cache.entries());
  }

  // ────────────────────────────────────────────
  // 내부: KHOA API 호출 + 캐시 구성
  // ────────────────────────────────────────────

  /**
   * KHOA API 호출 → 오늘 + 내일 데이터 파싱 → 메모리 캐시 저장
   *
   * 데이터 구조:
   *   - 스팟당 행 수: 2(오전/오후) × 3(초급/중급/상급) = 6행/스팟/일
   *   - numOfRows=300: 16스팟 × 6행 = 96행 (300이면 오늘+7일치 전부 포함)
   */
  private async fetchAndCache(): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('KHOA_SURFING_API_KEY 미설정 — 서핑지수 캐시 생략');
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      const response = await firstValueFrom(
        this.httpService.get<any>(this.endpoint, {
          params: {
            serviceKey: this.apiKey,
            type: 'json',
            numOfRows: 300,
            reqDate: today,
          },
        }),
      );

      const items: KhoaApiItem[] = response.data?.body?.items?.item ?? [];

      if (!items.length) {
        this.logger.warn('KHOA API 응답 항목 없음');
        return;
      }

      /**
       * 오늘 날짜 항목만 필터 후 캐시 구성
       * (API는 7일치 반환 → 오늘 데이터만 사용)
       */
      const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const todayItems = items.filter((i) => i.predcYmd === todayStr);

      /** 현재 시간 기준 오전(am) / 오후(pm) 판별 */
      const currentHour = new Date().getHours();
      const currentSlot = currentHour < 12 ? '오전' : '오후';

      /**
       * 스팟명 + 시간대 + 레벨별로 그룹화
       * 구조: spotName → { 오전: { 초급: item, 중급: item, 상급: item }, 오후: {...} }
       */
      const grouped = new Map<string, Map<string, Map<string, KhoaApiItem>>>();

      for (const item of todayItems) {
        if (!grouped.has(item.surfPlcNm)) grouped.set(item.surfPlcNm, new Map());
        const byTime = grouped.get(item.surfPlcNm)!;
        if (!byTime.has(item.predcNoonSeCd)) byTime.set(item.predcNoonSeCd, new Map());
        byTime.get(item.predcNoonSeCd)!.set(item.grdCn, item);
      }

      /**
       * 그룹화된 데이터 → KhoaSpotData 구조로 변환 → 캐시 저장
       */
      const newCache = new Map<string, KhoaSpotData>();

      for (const [spotName, byTime] of grouped.entries()) {
        const buildTimeSlot = (slot: string): KhoaTimeSlot | null => {
          const levelMap = byTime.get(slot);
          if (!levelMap) return null;

          /** 기준 행 (수치 데이터는 레벨 무관하게 동일) */
          const ref = levelMap.get('초급') ?? levelMap.values().next().value as KhoaApiItem | undefined;
          if (!ref) return null;

          return {
            levelIndex: {
              beginner:     levelMap.get('초급')?.totalIndex ?? '정보없음',
              intermediate: levelMap.get('중급')?.totalIndex ?? '정보없음',
              advanced:     levelMap.get('상급')?.totalIndex ?? '정보없음',
            },
            waveHeight:       Number(ref.avgWvhgt),
            wavePeriod:       Number(ref.avgWvpd),
            windSpeed:        Number(ref.avgWspd),
            waterTemperature: Number(ref.avgWtem),
          };
        };

        const am = buildTimeSlot('오전');
        const pm = buildTimeSlot('오후');

        newCache.set(spotName, {
          khoaName: spotName,
          am,
          pm,
          /** 현재 시간대 데이터 (오전 12시 기준) */
          current: currentSlot === '오전' ? am : pm,
          updatedAt: new Date(),
        });
      }

      this.cache = newCache;
      this.logger.log(`KHOA 서핑지수 캐시 갱신 완료: ${newCache.size}개 스팟 (${todayStr} ${currentSlot})`);

      /** DB에 히스토리 저장 (보정 계수 계산용) */
      await this.saveToDatabase(newCache, todayStr);

    } catch (error) {
      this.logger.error(`KHOA API 호출 실패: ${error}`);
    }
  }

  // ────────────────────────────────────────────
  // 내부: DB 저장
  // ────────────────────────────────────────────

  /**
   * KHOA 캐시 데이터를 khoa_data 테이블에 저장
   *
   * - KHOA 스팟명 → 우리 DB spot_id 역방향 조회
   * - 같은 (spot_id, recorded_date, time_slot) 이미 있으면 UPDATE (upsert)
   * - 오전/오후 각각 별도 행으로 저장
   *
   * @param cache - 방금 갱신된 KHOA 캐시
   * @param todayStr - 저장할 날짜 (YYYY-MM-DD)
   */
  private async saveToDatabase(
    cache: Map<string, KhoaSpotData>,
    todayStr: string,
  ): Promise<void> {
    /** KHOA 스팟명 → 우리 DB 스팟명 역방향 매핑 */
    const khoaToOurName: Record<string, string> = Object.fromEntries(
      Object.entries(OUR_NAME_TO_KHOA).map(([ourName, khoaName]) => [khoaName, ourName]),
    );

    /** 우리 DB 스팟명 → spot_id 캐시 (N번 SELECT 방지) */
    const spotIds = new Map<string, string>();

    let savedCount = 0;

    for (const [khoaName, spotData] of cache.entries()) {
      const ourName = khoaToOurName[khoaName];
      if (!ourName) continue; // 우리 DB에 없는 스팟 스킵

      /** spot_id 조회 (이미 캐시에 있으면 재사용) */
      if (!spotIds.has(ourName)) {
        const spot = await this.spotRepo.findOne({ where: { name: ourName }, select: ['id'] });
        if (!spot) continue;
        spotIds.set(ourName, spot.id);
      }
      const spotId = spotIds.get(ourName)!;

      /** 오전/오후 각각 저장 */
      for (const [slot, timeData] of [['오전', spotData.am], ['오후', spotData.pm]] as const) {
        if (!timeData) continue;

        await this.khoaDataRepo.upsert(
          {
            spotId,
            khoaName,
            recordedDate: todayStr,
            timeSlot:     slot,
            waveHeight:        timeData.waveHeight,
            wavePeriod:        timeData.wavePeriod,
            windSpeed:         timeData.windSpeed,
            waterTemperature:  timeData.waterTemperature,
            beginnerIndex:     timeData.levelIndex.beginner,
            intermediateIndex: timeData.levelIndex.intermediate,
            advancedIndex:     timeData.levelIndex.advanced,
          },
          ['spotId', 'recordedDate', 'timeSlot'], // UNIQUE 키 (충돌 시 UPDATE)
        );
        savedCount++;
      }
    }

    this.logger.log(`KHOA DB 저장 완료: ${savedCount}행 (${todayStr})`);
  }
}
