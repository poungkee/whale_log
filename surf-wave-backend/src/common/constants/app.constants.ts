/**
 * @file app.constants.ts
 * @description 애플리케이션 전역에서 사용되는 상수값 정의 파일
 *
 * 페이지네이션, 이미지 업로드, 댓글, 닉네임, 게시글, Q&A, 투표, 인증, 캐시 등
 * 각 도메인별 제한값과 기본값을 중앙 집중적으로 관리합니다.
 * 'as const' 단언을 사용하여 값이 변경되지 않는 읽기 전용 상수로 선언합니다.
 */

/** 페이지네이션 관련 상수 - 목록 조회 시 페이지 분할에 사용 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,       // 기본 시작 페이지 번호
  DEFAULT_LIMIT: 20,     // 한 페이지당 기본 항목 수
  MAX_LIMIT: 100,        // 한 페이지당 최대 항목 수 (과도한 데이터 요청 방지)
} as const;

/** 이미지 업로드 관련 상수 - 파일 크기, 개수, 허용 타입 제한 */
export const IMAGE = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 최대 파일 크기: 10MB
  MAX_COUNT_PER_POST: 10,          // 게시글당 최대 이미지 수
  MAX_COUNT_PER_DIARY: 5,          // 서핑 다이어리당 최대 이미지 수
  MAX_COUNT_PER_PROFILE: 1,        // 프로필 사진 최대 수
  ALLOWED_MIME_TYPES: [             // 허용되는 이미지 MIME 타입 목록
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ],
  THUMBNAIL_WIDTH: 300,             // 썸네일 가로 크기 (px)
  THUMBNAIL_HEIGHT: 300,            // 썸네일 세로 크기 (px)
} as const;

/** 댓글 관련 상수 - 대댓글 깊이 및 글자 수 제한 */
export const COMMENT = {
  MAX_DEPTH: 3,           // 대댓글 최대 중첩 깊이 (댓글 → 대댓글 → 대대댓글)
  MAX_LENGTH: 1000,       // 댓글 최대 글자 수
} as const;

/** 닉네임 관련 상수 - 닉네임 길이 제한 */
export const NICKNAME = {
  MIN_LENGTH: 2,          // 닉네임 최소 글자 수
  MAX_LENGTH: 20,         // 닉네임 최대 글자 수
} as const;

/** 커뮤니티 게시글 관련 상수 */
export const POST = {
  TITLE_MAX_LENGTH: 100,    // 게시글 제목 최대 글자 수
  CONTENT_MAX_LENGTH: 5000, // 게시글 본문 최대 글자 수
} as const;

/** Q&A 질문 관련 상수 */
export const QUESTION = {
  TITLE_MAX_LENGTH: 200,    // 질문 제목 최대 글자 수
  CONTENT_MAX_LENGTH: 5000, // 질문 본문 최대 글자 수
} as const;

/** Q&A 답변 관련 상수 */
export const ANSWER = {
  CONTENT_MAX_LENGTH: 5000, // 답변 본문 최대 글자 수
} as const;

/** 서핑 스팟 투표 관련 상수 - 하루 투표 횟수 제한 */
export const SPOT_VOTE = {
  DAILY_LIMIT: 1,           // 하루에 한 스팟당 1회만 투표 가능
} as const;

/** 인증 관련 상수 - Firebase 토큰 헤더 형식 */
export const AUTH = {
  FIREBASE_TOKEN_HEADER: 'Authorization',  // 인증 토큰이 담기는 HTTP 헤더명
  BEARER_PREFIX: 'Bearer ',                // Bearer 토큰 접두사
} as const;

/** 캐시 TTL (Time To Live) 상수 - Redis 캐시 만료 시간 (초 단위) */
export const CACHE = {
  SHORT_TTL: 60,          // 1분 - 자주 변경되는 데이터용
  MEDIUM_TTL: 300,        // 5분 - 중간 빈도 변경 데이터용
  LONG_TTL: 3600,         // 1시간 - 거의 변경되지 않는 데이터용
  SPOT_LIST_TTL: 600,     // 10분 - 서핑 스팟 목록 캐시용
} as const;
