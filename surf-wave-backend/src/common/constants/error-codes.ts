/**
 * @file error-codes.ts
 * @description 애플리케이션 전역 에러 코드 정의 파일
 *
 * 모든 도메인별 에러 코드와 메시지를 중앙에서 관리합니다.
 * 각 에러는 고유한 코드(예: AUTH_001)와 사용자에게 표시할 메시지를 포함합니다.
 * 프론트엔드에서 에러 코드를 기반으로 적절한 UI 처리를 할 수 있도록 합니다.
 *
 * 에러 코드 체계:
 * - AUTH_0XX : 인증 관련 에러
 * - USER_0XX : 사용자 관련 에러
 * - SPOT_0XX : 서핑 스팟 관련 에러
 * - DIARY_0XX : 다이어리 관련 에러
 * - POST_0XX : 게시글 관련 에러
 * - COMMENT_0XX : 댓글 관련 에러
 * - QUESTION_0XX : 질문 관련 에러
 * - ANSWER_0XX : 답변 관련 에러
 * - REPORT_0XX : 신고 관련 에러
 * - UPLOAD_0XX : 파일 업로드 관련 에러
 * - COMMON_0XX : 공통 에러
 */

/** 에러 상세 정보 인터페이스 - 코드와 메시지로 구성 */
interface ErrorDetail {
  code: string;      // 고유 에러 코드 (예: AUTH_001)
  message: string;   // 에러 설명 메시지
}

/** 인증 관련 에러 타입 */
interface AuthErrors {
  INVALID_TOKEN: ErrorDetail;       // 유효하지 않거나 만료된 토큰
  USER_NOT_FOUND: ErrorDetail;      // DB에서 인증된 사용자를 찾을 수 없음
  ALREADY_REGISTERED: ErrorDetail;  // 이미 가입된 사용자
  UNAUTHORIZED: ErrorDetail;        // 인증이 필요한 리소스에 비인증 접근
}

/** 사용자 관련 에러 타입 */
interface UserErrors {
  NICKNAME_TAKEN: ErrorDetail;      // 닉네임 중복
  PROFILE_NOT_FOUND: ErrorDetail;   // 사용자 프로필 없음
  SUSPENDED: ErrorDetail;           // 정지된 계정
}

/** 서핑 스팟 관련 에러 타입 */
interface SpotErrors {
  NOT_FOUND: ErrorDetail;             // 스팟을 찾을 수 없음
  ALREADY_VOTED_TODAY: ErrorDetail;   // 오늘 이미 투표함
  ALREADY_FAVORITED: ErrorDetail;     // 이미 즐겨찾기에 추가됨
}

/** 서핑 다이어리 관련 에러 타입 */
interface DiaryErrors {
  NOT_FOUND: ErrorDetail;     // 다이어리 항목 없음
  NOT_OWNER: ErrorDetail;     // 다이어리 소유자가 아님
  INVALID_DATE: ErrorDetail;  // 유효하지 않은 날짜
}

/** 커뮤니티 게시글 관련 에러 타입 */
interface PostErrors {
  NOT_FOUND: ErrorDetail;   // 게시글 없음
  NOT_AUTHOR: ErrorDetail;  // 작성자가 아님
  HIDDEN: ErrorDetail;      // 숨김 처리된 게시글
}

/** 댓글 관련 에러 타입 */
interface CommentErrors {
  NOT_FOUND: ErrorDetail;           // 댓글 없음
  NOT_AUTHOR: ErrorDetail;          // 작성자가 아님
  MAX_DEPTH_EXCEEDED: ErrorDetail;  // 최대 중첩 깊이 초과
}

/** Q&A 질문 관련 에러 타입 */
interface QuestionErrors {
  NOT_FOUND: ErrorDetail;       // 질문 없음
  NOT_AUTHOR: ErrorDetail;      // 작성자가 아님
  ALREADY_CLOSED: ErrorDetail;  // 이미 마감된 질문
}

/** Q&A 답변 관련 에러 타입 */
interface AnswerErrors {
  NOT_FOUND: ErrorDetail;         // 답변 없음
  NOT_AUTHOR: ErrorDetail;        // 작성자가 아님
  ALREADY_ACCEPTED: ErrorDetail;  // 이미 채택된 답변이 있음
}

/** 신고 관련 에러 타입 */
interface ReportErrors {
  NOT_FOUND: ErrorDetail;    // 신고 없음
  DUPLICATE: ErrorDetail;    // 중복 신고
  SELF_REPORT: ErrorDetail;  // 자기 자신의 콘텐츠 신고 불가
}

/** 파일 업로드 관련 에러 타입 */
interface UploadErrors {
  FILE_TOO_LARGE: ErrorDetail;    // 파일 크기 초과
  INVALID_TYPE: ErrorDetail;      // 지원하지 않는 파일 타입
  MAX_COUNT_EXCEEDED: ErrorDetail; // 최대 파일 수 초과
}

/** 공통 에러 타입 */
interface CommonErrors {
  FORBIDDEN: ErrorDetail;      // 권한 없음 (403)
  NOT_FOUND: ErrorDetail;      // 리소스 없음 (404)
  BAD_REQUEST: ErrorDetail;    // 잘못된 요청 (400)
  INTERNAL_ERROR: ErrorDetail; // 서버 내부 오류 (500)
}

/** 전체 에러 코드 구조 인터페이스 - 도메인별로 그룹화 */
interface ErrorCodes {
  AUTH: AuthErrors;
  USER: UserErrors;
  SPOT: SpotErrors;
  DIARY: DiaryErrors;
  POST: PostErrors;
  COMMENT: CommentErrors;
  QUESTION: QuestionErrors;
  ANSWER: AnswerErrors;
  REPORT: ReportErrors;
  UPLOAD: UploadErrors;
  COMMON: CommonErrors;
}

/** 에러 코드 상수 객체 - 서비스 레이어에서 예외 발생 시 이 코드를 참조하여 일관된 에러 응답 생성 */
export const ERROR_CODES: ErrorCodes = {
  AUTH: {
    INVALID_TOKEN: { code: 'AUTH_001', message: 'Invalid or expired authentication token' },
    USER_NOT_FOUND: { code: 'AUTH_002', message: 'Authenticated user not found in database' },
    ALREADY_REGISTERED: { code: 'AUTH_003', message: 'User is already registered' },
    UNAUTHORIZED: { code: 'AUTH_004', message: 'Authentication is required to access this resource' },
  },
  USER: {
    NICKNAME_TAKEN: { code: 'USER_001', message: 'This nickname is already taken' },
    PROFILE_NOT_FOUND: { code: 'USER_002', message: 'User profile not found' },
    SUSPENDED: { code: 'USER_003', message: 'User account has been suspended' },
  },
  SPOT: {
    NOT_FOUND: { code: 'SPOT_001', message: 'Surf spot not found' },
    ALREADY_VOTED_TODAY: { code: 'SPOT_002', message: 'You have already voted for this spot today' },
    ALREADY_FAVORITED: { code: 'SPOT_003', message: 'This spot is already in your favorites' },
  },
  DIARY: {
    NOT_FOUND: { code: 'DIARY_001', message: 'Diary entry not found' },
    NOT_OWNER: { code: 'DIARY_002', message: 'You are not the owner of this diary entry' },
    INVALID_DATE: { code: 'DIARY_003', message: 'Invalid date for diary entry' },
  },
  POST: {
    NOT_FOUND: { code: 'POST_001', message: 'Post not found' },
    NOT_AUTHOR: { code: 'POST_002', message: 'You are not the author of this post' },
    HIDDEN: { code: 'POST_003', message: 'This post has been hidden' },
  },
  COMMENT: {
    NOT_FOUND: { code: 'COMMENT_001', message: 'Comment not found' },
    NOT_AUTHOR: { code: 'COMMENT_002', message: 'You are not the author of this comment' },
    MAX_DEPTH_EXCEEDED: { code: 'COMMENT_003', message: 'Maximum comment nesting depth exceeded' },
  },
  QUESTION: {
    NOT_FOUND: { code: 'QUESTION_001', message: 'Question not found' },
    NOT_AUTHOR: { code: 'QUESTION_002', message: 'You are not the author of this question' },
    ALREADY_CLOSED: { code: 'QUESTION_003', message: 'This question has already been closed' },
  },
  ANSWER: {
    NOT_FOUND: { code: 'ANSWER_001', message: 'Answer not found' },
    NOT_AUTHOR: { code: 'ANSWER_002', message: 'You are not the author of this answer' },
    ALREADY_ACCEPTED: { code: 'ANSWER_003', message: 'An answer has already been accepted for this question' },
  },
  REPORT: {
    NOT_FOUND: { code: 'REPORT_001', message: 'Report not found' },
    DUPLICATE: { code: 'REPORT_002', message: 'You have already reported this content' },
    SELF_REPORT: { code: 'REPORT_003', message: 'You cannot report your own content' },
  },
  UPLOAD: {
    FILE_TOO_LARGE: { code: 'UPLOAD_001', message: 'File size exceeds the maximum allowed limit' },
    INVALID_TYPE: { code: 'UPLOAD_002', message: 'File type is not supported' },
    MAX_COUNT_EXCEEDED: { code: 'UPLOAD_003', message: 'Maximum number of files exceeded' },
  },
  COMMON: {
    FORBIDDEN: { code: 'COMMON_001', message: 'You do not have permission to perform this action' },
    NOT_FOUND: { code: 'COMMON_002', message: 'Requested resource not found' },
    BAD_REQUEST: { code: 'COMMON_003', message: 'Invalid request parameters' },
    INTERNAL_ERROR: { code: 'COMMON_004', message: 'An unexpected internal error occurred' },
  },
};
