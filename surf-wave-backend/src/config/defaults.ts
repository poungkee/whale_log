/**
 * @file defaults.ts
 * @description 환경변수 기본값 상수 - 개발 환경 전용 + 프로덕션 안전장치
 *
 * ===== 보안 정책 =====
 * - DB_PASSWORD, JWT_SECRET: 프로덕션에서는 반드시 환경변수로 설정 필수
 * - 여기 기본값은 로컬 개발 환경(NODE_ENV=development)에서만 사용
 * - 프로덕션에서 환경변수 누락 시 앱이 시작되지 않음 (validateProductionEnv)
 */

// ===== 데이터베이스 접속 정보 (개발용 기본값) =====
/** DB 호스트 기본값 (로컬 개발용) */
export const DEFAULT_DB_HOST = 'localhost';

/** DB 포트 기본값 (PostgreSQL 표준 포트) */
export const DEFAULT_DB_PORT = 5432;

/** DB 사용자명 기본값 (로컬 개발용) */
export const DEFAULT_DB_USERNAME = 'surfwave';

/** DB 비밀번호 기본값 (로컬 개발용 - 프로덕션에서는 환경변수 필수) */
export const DEFAULT_DB_PASSWORD = 'surfwave123';

/** DB 데이터베이스명 기본값 */
export const DEFAULT_DB_DATABASE = 'surfwave';

// ===== JWT 인증 =====
/** JWT 서명/검증 비밀키 기본값 (로컬 개발용 - 프로덕션에서는 환경변수 필수) */
export const DEFAULT_JWT_SECRET = 'surfwave-jwt-secret-dev-2026';

/**
 * 프로덕션 환경 필수 환경변수 검증 (P2-5 강화: JWT_SECRET 최소 길이 추가)
 *
 * 앱 시작 시 호출하여 보안에 민감한 환경변수가 올바르게 설정되었는지 확인합니다.
 * 검증 실패 시 앱 시작을 완전 차단하여 보안 사고를 사전에 방지합니다.
 *
 * 검증 항목:
 * 1. 필수 환경변수 존재 여부 (JWT_SECRET, DB_PASSWORD, DB_HOST, KAKAO_REST_API_KEY)
 * 2. JWT_SECRET이 개발용 기본값과 동일한지 확인 → 동일하면 차단
 * 3. JWT_SECRET 최소 길이 32자 미달 시 차단 (너무 짧은 시크릿은 brute force 위험)
 */
export function validateProductionEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  const requiredVars = [
    'JWT_SECRET',
    'DB_PASSWORD',
    'DB_HOST',
    'KAKAO_REST_API_KEY',
  ];

  /** 1. 필수 환경변수 존재 확인 */
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `[보안] 프로덕션 환경에서 필수 환경변수가 누락되었습니다: ${missing.join(', ')}\n` +
      `앱을 시작할 수 없습니다. .env 파일 또는 환경변수를 설정하세요.`,
    );
  }

  const jwtSecret = process.env.JWT_SECRET!;

  /** 2. JWT_SECRET이 개발용 기본값과 동일하면 차단 */
  if (jwtSecret === DEFAULT_JWT_SECRET) {
    throw new Error(
      '[보안] 프로덕션에서 개발용 JWT_SECRET을 사용할 수 없습니다. 강력한 비밀키를 설정하세요.',
    );
  }

  /**
   * 3. JWT_SECRET 최소 길이 검증 (P2-5 추가)
   * 32자 미만은 brute force 공격에 취약합니다.
   * 권장: openssl rand -base64 48 로 생성한 64자 이상의 랜덤 문자열
   */
  if (jwtSecret.length < 32) {
    throw new Error(
      `[보안] JWT_SECRET이 너무 짧습니다 (${jwtSecret.length}자). ` +
      `최소 32자 이상이어야 합니다. openssl rand -base64 48 로 생성하세요.`,
    );
  }
}
