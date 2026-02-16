/**
 * @file types/index.ts
 * @description 프론트엔드 전역 타입 정의
 *
 * 백엔드 API 응답 구조와 1:1 대응하는 타입을 정의합니다.
 * 대시보드 API: GET /api/v1/dashboard/forecasts?level={level}
 */

/** 서핑 레벨 - 사용자가 선택하는 서핑 실력 레벨 (백엔드 Difficulty enum과 동일) */
export type SurfLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

/** 앱 화면 상태 - 현재 표시 중인 화면 */
export type AppScreen = 'splash' | 'welcome' | 'login' | 'register' | 'level-select' | 'main';

/** 메인 탭 - 하단 네비게이션의 탭 종류 */
export type MainTab = 'home' | 'map' | 'feed' | 'mypage';

/** 조석 상태 - 밀물/썰물/만조/간조 */
export type TideStatus = 'HIGH' | 'LOW' | 'RISING' | 'FALLING';

/** 레벨 적합도 판정 결과 */
export type LevelFitResult = 'PASS' | 'WARNING' | 'BLOCKED';

/**
 * 인증 응답 데이터 - 로그인/회원가입 API 응답 구조
 * 백엔드 AuthService의 register()/login() 반환값
 */
export interface AuthResponse {
  /** JWT 액세스 토큰 - 이후 인증 필요 API 호출 시 Authorization 헤더에 사용 */
  accessToken: string;
  /** 사용자 정보 - 민감 정보(passwordHash 등)가 제거된 안전한 사용자 데이터 */
  user: UserInfo;
}

/**
 * 사용자 정보 - 로그인 후 클라이언트에서 관리하는 사용자 데이터
 * 백엔드 AuthService.sanitizeUser()의 반환값과 동일
 */
export interface UserInfo {
  id: string;                    // 사용자 UUID
  email: string;                 // 이메일
  nickname: string;              // 닉네임
  avatarUrl: string | null;      // 프로필 사진 URL (null이면 기본 아바타)
  role: string;                  // 역할 ('USER' | 'ADMIN')
  surfLevel: string | null;      // 서핑 레벨 (null이면 아직 선택 안 함)
  provider: string | null;       // 소셜 로그인 제공자 ('GOOGLE' | 'KAKAO' | null)
  notificationsEnabled: boolean; // 알림 수신 여부
}

/**
 * 대시보드 API 전체 응답 구조
 * GET /api/v1/dashboard/forecasts?level={level}
 */
export interface DashboardResponse {
  fetchedAt: string;          // 데이터 조회 시각 (ISO 8601)
  totalSpots: number;         // 반환된 스팟 수
  spots: SpotForecast[];      // 스팟별 예보 데이터 배열
}

/**
 * 스팟 기본 정보 - 백엔드 Spot 엔티티에서 대시보드에 포함되는 필드
 */
export interface SpotInfo {
  id: string;                    // 스팟 UUID
  name: string;                  // 스팟 이름 (예: "양양 서피비치")
  description: string | null;    // 스팟 설명
  imageUrl: string | null;       // 스팟 대표 이미지 URL
  latitude: string;              // 위도 (문자열 - TypeORM decimal)
  longitude: string;             // 경도 (문자열 - TypeORM decimal)
  region: string;                // 지역 (예: "양양", "부산")
  difficulty: string;            // 난이도 (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
  breakType: string | null;      // 파도 유형 (beach_break | reef_break | point_break)
  season: string | null;         // 최적 시즌 (예: "4월~10월")
  coastFacingDeg: number | null; // 해안 방향 (0-359도)
  bestSwellDirection: string | null; // 최적 스웰 방향
}

/**
 * 예보 데이터 - 백엔드 Forecast 엔티티의 주요 필드
 * ⚠️ TypeORM decimal 컬럼은 문자열로 반환됨 → Number() 변환 필요
 */
export interface ForecastInfo {
  id: string;                          // 예보 UUID
  forecastTime: string;                // 예보 시각 (ISO 8601)
  waveHeight: string;                  // 파고 (미터, 문자열)
  wavePeriod: string;                  // 파도 주기 (초, 문자열)
  waveDirection: string;               // 파도 방향 (도, 문자열)
  windSpeed: string | null;            // 풍속 (km/h, 문자열)
  windGusts: string | null;            // 돌풍 (km/h, 문자열)
  windDirection: string | null;        // 풍향 (도, 문자열, FROM 방향)
  swellHeight: string | null;          // 스웰 높이 (미터, 문자열)
  swellPeriod: string | null;          // 스웰 주기 (초, 문자열)
  swellDirection: string | null;       // 스웰 방향 (도, 문자열)
  tideHeight: string | null;           // 조석 높이 (미터, 문자열)
  tideStatus: TideStatus | null;       // 조석 상태 (HIGH/LOW/RISING/FALLING)
  waterTemperature: string | null;     // 수온 (°C, 문자열)
  airTemperature: string | null;       // 기온 (°C, 문자열)
  weatherCondition: string | null;     // 날씨 상태 (맑음/흐림 등)
}

/**
 * 서핑 적합도 세부 점수 - 5개 항목 각각 0~10점
 */
export interface RatingDetail {
  waveFit: number;       // 파고 적합도 (가중치 25%)
  periodFit: number;     // 주기 적합도 (가중치 15%)
  windSpeedFit: number;  // 풍속 적합도 (가중치 20%)
  swellFit: number;      // 스웰 방향 적합도 (가중치 25%)
  windDirFit: number;    // 풍향 적합도 (가중치 15%)
}

/**
 * 레벨별 적합도 판정 - 초급/중급/상급 각각 PASS/WARNING/BLOCKED
 */
export interface LevelFit {
  BEGINNER: LevelFitResult;
  INTERMEDIATE: LevelFitResult;
  ADVANCED: LevelFitResult;
  [key: string]: LevelFitResult;  // EXPERT 등 추가 레벨 대응
}

/**
 * 간단 컨디션 요약 - 파도/바람/전체 상태를 한국어 텍스트로
 */
export interface SimpleCondition {
  waveStatus: string;   // "잔잔" | "적당" | "높음" | "위험"
  windStatus: string;   // "약함" | "보통" | "강함" | "매우 강함"
  overall: string;      // "좋음" | "보통" | "주의"
}

/**
 * 스팟별 예보 데이터 - 대시보드 API 응답의 spots[] 배열 내 각 항목
 *
 * 실제 API 응답 구조 (백엔드 forecasts.service.ts getDashboardData):
 * {
 *   spot: { 스팟 엔티티 전체 },
 *   forecast: { 예보 엔티티 전체 },
 *   surfRating: 0~10 (v1.3 가중합 점수),
 *   levelFit: { BEGINNER: "PASS", INTERMEDIATE: "PASS", ADVANCED: "PASS" },
 *   detail: { waveFit, periodFit, windSpeedFit, swellFit, windDirFit },
 *   recommendationKo: "한국어 추천 문구",
 *   safetyReasons: ["안전 경고 사유 배열"],
 *   simpleCondition: { waveStatus, windStatus, overall }
 * }
 */
/**
 * 지역 필터 - 2단계 드롭다운 구조
 * major: 대분류 ("전체" / "국내" / "발리")
 * sub: 세부 지역 (null이면 대분류 전체 선택)
 */
export interface RegionFilter {
  /** 대분류: 전체, 국내, 발리 */
  major: '전체' | '국내' | '발리';
  /** 세부 지역 키 (null = 대분류 전체) */
  sub: string | null;
}

/**
 * 지역 그룹 정의 - 드롭다운 메뉴 항목
 */
export interface RegionGroup {
  /** 세부 지역 키 (matchRegion에서 사용) */
  key: string;
  /** 화면 표시용 한국어 라벨 */
  label: string;
  /** DB region 값 매칭 목록 */
  regions: string[];
}

export interface SpotForecast {
  /** 스팟 기본 정보 */
  spot: SpotInfo;
  /** 현재 예보 원본 데이터 - 예보가 없으면 null */
  forecast: ForecastInfo | null;
  /** 서핑 적합도 점수 (0~10) - v1.3 가중합 계산 결과 */
  surfRating: number;
  /** 레벨별 적합도 판정 (PASS/WARNING/BLOCKED) */
  levelFit: LevelFit;
  /** 세부 적합도 점수 5개 - 예보 없으면 null */
  detail: RatingDetail | null;
  /** 한국어 추천 문구 - 화면에 표시 */
  recommendationKo: string;
  /** 안전 경고 사유 배열 - 빈 배열이면 안전 */
  safetyReasons: string[];
  /** 초보자용 간단 상태 표시 - 예보 없으면 null */
  simpleCondition: SimpleCondition | null;
}
