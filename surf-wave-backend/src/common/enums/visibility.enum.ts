/**
 * @file visibility.enum.ts
 * @description 콘텐츠 공개 범위 열거형
 *
 * 서핑 다이어리 등의 콘텐츠 공개 범위를 설정할 때 사용됩니다.
 */
export enum Visibility {
  PUBLIC = 'PUBLIC',     // 전체 공개 - 모든 사용자가 볼 수 있음
  PRIVATE = 'PRIVATE',   // 비공개 - 작성자 본인만 볼 수 있음
  FRIENDS = 'FRIENDS',   // 친구 공개 - 친구만 볼 수 있음
}
