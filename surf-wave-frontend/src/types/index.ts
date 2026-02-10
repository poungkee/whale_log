/**
 * @file types/index.ts
 * @description 프론트엔드 전역 타입 정의
 *
 * 앱에서 사용하는 모든 공통 타입을 정의합니다.
 */

/** 서핑 레벨 - 사용자가 선택하는 서핑 실력 레벨 (백엔드 Difficulty enum과 동일) */
export type SurfLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

/** 앱 화면 상태 - 현재 표시 중인 화면 */
export type AppScreen = 'splash' | 'welcome' | 'login' | 'register' | 'level-select' | 'main';

/** 메인 탭 - 하단 네비게이션의 탭 종류 */
export type MainTab = 'home' | 'map' | 'feed' | 'mypage';

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
 * 스팟별 예보 데이터 - 대시보드 API 응답의 spots[] 배열 내 각 항목
 *
 * 실제 API 응답 구조:
 * {
 *   "spot": { "id": "uuid", "name": "양양 서피비치", "region": "양양", "difficulty": "BEGINNER", ... },
 *   "forecast": { "waveHeight": "1.38", "wavePeriod": "10.0", "windSpeed": "9.40", ... },
 *   "surfRating": 5,
 *   "recommendation": "Perfect conditions for surfing!",
 *   "recommendationKo": "완벽한 서핑 컨디션이에요!",
 *   "simpleCondition": { "waveStatus": "적당", "windStatus": "약함", "overall": "좋음" }
 * }
 */
export interface SpotForecast {
  /** 스팟 기본 정보 */
  spot: {
    id: string;            // 스팟 UUID
    name: string;          // 스팟 이름 (예: "양양 서피비치")
    description: string;   // 스팟 설명
    latitude: string;      // 위도 (문자열)
    longitude: string;     // 경도 (문자열)
    region: string;        // 지역 (예: "양양", "부산", "Bali")
    difficulty: string;    // 난이도 (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
  };
  /** 현재 예보 원본 데이터 - 예보가 없으면 null */
  forecast: {
    forecastTime: string;   // 예보 시각 (ISO 8601)
    waveHeight: string;     // 파고 (미터, 문자열)
    wavePeriod: string;     // 파도 주기 (초, 문자열)
    waveDirection: string;  // 파도 방향 (도, 문자열)
    windSpeed: string | null;      // 풍속 (m/s, 문자열 또는 null)
    windDirection: string | null;  // 풍향 (도, 문자열 또는 null)
    swellHeight: string;    // 스웰 높이 (미터, 문자열)
    swellPeriod: string;    // 스웰 주기 (초, 문자열)
    swellDirection: string; // 스웰 방향 (도, 문자열)
  } | null;
  /** 서핑 적합도 점수 (1~5) - 백엔드에서 파고/풍속 기반 계산 */
  surfRating: number;
  /** 영어 추천 문구 */
  recommendation: string;
  /** 한국어 추천 문구 - 화면에 표시 */
  recommendationKo: string;
  /** 초보자용 간단 상태 표시 - 파도/바람/전체 상태를 한국어 텍스트로 */
  simpleCondition: {
    waveStatus: string;   // "잔잔" | "적당" | "높음" | "위험"
    windStatus: string;   // "약함" | "보통" | "강함" | "매우 강함"
    overall: string;      // "좋음" | "보통" | "주의"
  };
}
