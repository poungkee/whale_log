/**
 * @file board-type.enum.ts
 * @description 서핑 보드 종류 열거형
 *
 * 서핑 다이어리 작성 시 사용한 보드 종류를 선택할 때 사용됩니다.
 */
export enum BoardType {
  SHORTBOARD = 'SHORTBOARD',   // 숏보드 - 기동성이 좋은 짧은 보드
  LONGBOARD = 'LONGBOARD',     // 롱보드 - 안정적이고 긴 보드
  FUNBOARD = 'FUNBOARD',       // 펀보드 - 숏보드와 롱보드의 중간 크기
  FISH = 'FISH',               // 피쉬보드 - 넓고 짧은 물고기 모양 보드
  SUP = 'SUP',                 // SUP (Stand Up Paddle) - 스탠드업 패들보드
  BODYBOARD = 'BODYBOARD',     // 바디보드 - 엎드려서 타는 보드
  FOIL = 'FOIL',               // 포일보드 - 수중익이 달린 보드
  OTHER = 'OTHER',             // 기타
}
