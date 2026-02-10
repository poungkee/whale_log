/**
 * @file global.d.ts
 * @description 외부 SDK 전역 타입 선언 - Google Identity Services, Kakao JS SDK
 *
 * index.html에서 <script> 태그로 로드하는 외부 SDK들의 타입을 선언하여
 * TypeScript에서 타입 안전하게 사용할 수 있도록 합니다.
 */

// ===== Google Identity Services (GIS) 타입 선언 =====

/** Google GIS 라이브러리의 CredentialResponse - 로그인 성공 시 반환되는 응답 */
interface GoogleCredentialResponse {
  /** Google ID 토큰 (JWT) - 백엔드로 전달하여 검증 */
  credential: string;
  /** 요청 시 전달한 클라이언트 ID */
  clientId?: string;
  /** 사용자가 선택한 방식 ('btn' = 버튼 클릭, 'auto' = 자동 로그인) */
  select_by?: string;
}

/** Google GIS 초기화 옵션 */
interface GoogleIdConfiguration {
  /** Google OAuth 클라이언트 ID (VITE_GOOGLE_CLIENT_ID 환경변수 값) */
  client_id: string;
  /** 로그인 성공 시 호출되는 콜백 함수 */
  callback: (response: GoogleCredentialResponse) => void;
  /** 자동 로그인 비활성화 여부 (true면 자동 로그인 안 함) */
  auto_select?: boolean;
  /** 세션 중 자동 로그인 취소 여부 */
  cancel_on_tap_outside?: boolean;
}

/** Google GIS google.accounts.id 네임스페이스 */
interface GoogleAccountsId {
  /** GIS 라이브러리 초기화 - 클라이언트 ID 및 콜백 설정 */
  initialize: (config: GoogleIdConfiguration) => void;
  /** 원탭 로그인 프롬프트 표시 (팝업) */
  prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
  /** Google 로그인 버튼 렌더링 (DOM 요소에 버튼 삽입) */
  renderButton: (element: HTMLElement, options: {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    width?: number;
  }) => void;
}

/** 전역 google 네임스페이스 선언 */
declare namespace google {
  namespace accounts {
    const id: GoogleAccountsId;
  }
}

// ===== Kakao JavaScript SDK 타입 선언 =====

/** Kakao SDK 전역 객체 */
interface KakaoSDK {
  /** SDK 초기화 여부 확인 */
  isInitialized: () => boolean;
  /** SDK 초기화 - JavaScript 키를 전달하여 Kakao SDK 활성화 */
  init: (appKey: string) => void;
  /** 인증 관련 기능 (로그인, 로그아웃 등) */
  Auth: {
    /** Kakao 로그인 페이지로 리다이렉트 (인가코드 발급 방식) */
    authorize: (options: {
      /** 인가코드를 전달받을 리다이렉트 URI */
      redirectUri: string;
      /** 요청할 동의 항목 (예: 'account_email') */
      scope?: string;
    }) => void;
  };
}

/** 전역 Kakao 객체 선언 */
declare const Kakao: KakaoSDK;
