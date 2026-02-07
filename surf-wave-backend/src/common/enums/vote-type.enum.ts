/**
 * @file vote-type.enum.ts
 * @description 서핑 스팟 투표 종류 열거형
 *
 * 사용자가 서핑 스팟에 대해 오늘의 파도 상태를 투표할 때 사용됩니다.
 * 커뮤니티 기반으로 실시간 서핑 컨디션 정보를 수집합니다.
 */
export enum VoteType {
  UP = 'UP',       // 좋음 (파도 상태 좋음, 서핑하기 좋은 날)
  DOWN = 'DOWN',   // 나쁨 (파도 상태 안 좋음)
}
