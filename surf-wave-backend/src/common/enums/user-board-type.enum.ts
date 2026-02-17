/**
 * @file user-board-type.enum.ts
 * @description 사용자 보드 타입 열거형 - 프로필에서 주로 사용하는 보드 종류
 *
 * 서핑 적합도 계산 시 보드 특성에 따라 다른 추천을 제공하기 위해 사용합니다.
 * - LONGBOARD: 롱보드 (안정적, 작은 파도에도 적합)
 * - MIDLENGTH: 미드렝스 (롱보드와 숏보드의 중간)
 * - SHORTBOARD: 숏보드 (기동성, 큰 파도에서 유리)
 * - UNSET: 미설정 (온보딩 미완료 상태)
 */
export enum UserBoardType {
  LONGBOARD = 'LONGBOARD',     // 롱보드 - 안정적, 작은 파도에도 잘 탐
  MIDLENGTH = 'MIDLENGTH',     // 미드렝스 - 중간 크기, 범용적
  SHORTBOARD = 'SHORTBOARD',   // 숏보드 - 기동성 좋음, 큰 파도에서 유리
  UNSET = 'UNSET',             // 미설정 - 아직 보드 타입을 선택하지 않은 상태
}
