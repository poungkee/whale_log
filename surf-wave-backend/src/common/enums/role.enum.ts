/**
 * @file role.enum.ts
 * @description 사용자 역할(권한) 열거형
 *
 * RBAC(Role-Based Access Control) 기반 접근 제어에 사용됩니다.
 * RolesGuard와 @Roles() 데코레이터를 통해 엔드포인트별 접근 권한을 제어합니다.
 */
export enum Role {
  USER = 'USER',     // 일반 사용자 - 기본 기능 이용 가능
  ADMIN = 'ADMIN',   // 관리자 - 스팟/가이드 관리, 사용자 제재, 신고 처리 등 관리 기능 사용 가능
}
