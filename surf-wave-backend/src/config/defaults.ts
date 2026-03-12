/**
 * @file defaults.ts
 * @description 환경변수 기본값 상수 - 하드코딩 중복 방지를 위해 한 곳에서 관리
 *
 * 모든 환경변수의 fallback 기본값을 여기서 정의합니다.
 * database.config.ts, data-source.ts, spot-seed.ts 등에서 import하여 사용합니다.
 *
 * ⚠️ 프로덕션 배포 시에는 반드시 .env 또는 환경변수로 실제 값을 설정하세요.
 *    여기 기본값은 로컬 개발 환경 전용입니다.
 */

// ===== 데이터베이스 접속 정보 =====
/** DB 호스트 기본값 (로컬 개발용) */
export const DEFAULT_DB_HOST = 'localhost';

/** DB 포트 기본값 (PostgreSQL 표준 포트) */
export const DEFAULT_DB_PORT = 5432;

/** DB 사용자명 기본값 (로컬 개발용) */
export const DEFAULT_DB_USERNAME = 'surfwave';

/** DB 비밀번호 기본값 (로컬 개발용) */
export const DEFAULT_DB_PASSWORD = 'surfwave123';

/** DB 데이터베이스명 기본값 */
export const DEFAULT_DB_DATABASE = 'surfwave';

// ===== JWT 인증 =====
/** JWT 서명/검증 비밀키 기본값 (로컬 개발용) */
export const DEFAULT_JWT_SECRET = 'surfwave-jwt-secret-dev-2026';
