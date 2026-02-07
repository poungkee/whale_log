/**
 * @file tide-status.enum.ts
 * @description 조수(밀물/썰물) 상태 열거형
 *
 * 서핑 예보 및 다이어리에서 현재 조수 상태를 기록할 때 사용됩니다.
 * 조수 상태는 서핑 가능 여부와 파도 품질에 영향을 줍니다.
 */
export enum TideStatus {
  HIGH = 'HIGH',         // 만조 (밀물 최고점)
  LOW = 'LOW',           // 간조 (썰물 최저점)
  RISING = 'RISING',     // 밀물 진행 중 (수위 상승 중)
  FALLING = 'FALLING',   // 썰물 진행 중 (수위 하강 중)
}
