/**
 * @file user-board-type.enum.ts
 * @description 사용자 보드 타입 열거형 - 프로필에서 주로 사용하는 보드 종류
 *
 * BoardType(다이어리용)과 동일한 8종류 + UNSET(미설정)
 * 서핑 적합도 계산 시 보드 특성에 따라 다른 추천을 제공하기 위해 사용합니다.
 */
export enum UserBoardType {
  SHORTBOARD = 'SHORTBOARD',   // 숏보드 - 기동성이 좋은 짧은 보드 (~6.4ft)
  LONGBOARD = 'LONGBOARD',     // 롱보드 - 안정적이고 긴 보드 (9ft+)
  FUNBOARD = 'FUNBOARD',       // 펀보드 - 숏보드와 롱보드의 중간 (7~8ft)
  FISH = 'FISH',               // 피쉬보드 - 넓고 짧은 물고기 모양 (5.2~6.2ft)
  SUP = 'SUP',                 // SUP (Stand Up Paddle) - 스탠드업 패들보드
  BODYBOARD = 'BODYBOARD',     // 바디보드 - 엎드려서 타는 보드
  FOIL = 'FOIL',               // 포일보드 - 수중익이 달린 보드
  OTHER = 'OTHER',             // 기타
  MIDLENGTH = 'MIDLENGTH',     // 미드렝스 - 중간 크기 (6.6~8ft, 레거시 호환)
  UNSET = 'UNSET',             // 미설정 - 아직 보드 타입을 선택하지 않은 상태
}
