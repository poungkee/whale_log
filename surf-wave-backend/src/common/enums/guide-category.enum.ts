/**
 * @file guide-category.enum.ts
 * @description 서핑 가이드(교육 콘텐츠) 카테고리 열거형
 *
 * 서핑 가이드 콘텐츠를 주제별로 분류할 때 사용됩니다.
 */
export enum GuideCategory {
  BEGINNER = 'BEGINNER',       // 초보자 가이드 - 서핑 입문 방법
  TECHNIQUE = 'TECHNIQUE',     // 기술 가이드 - 서핑 테크닉, 동작
  SAFETY = 'SAFETY',           // 안전 가이드 - 바다 안전, 응급 상황 대처
  EQUIPMENT = 'EQUIPMENT',     // 장비 가이드 - 보드, 웻수트 등 장비 선택
  ETIQUETTE = 'ETIQUETTE',     // 에티켓 가이드 - 서핑 매너, 라인업 규칙
  WEATHER = 'WEATHER',         // 날씨 가이드 - 파도, 바람, 조류 읽는 법
}
