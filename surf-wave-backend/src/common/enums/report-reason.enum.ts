/**
 * @file report-reason.enum.ts
 * @description 콘텐츠 신고 사유 열거형
 *
 * 사용자가 게시글, 댓글 등을 신고할 때 선택하는 사유 분류입니다.
 */
export enum ReportReason {
  SPAM = 'SPAM',                       // 스팸/광고
  HARASSMENT = 'HARASSMENT',           // 괴롭힘/욕설
  INAPPROPRIATE = 'INAPPROPRIATE',     // 부적절한 콘텐츠
  MISINFORMATION = 'MISINFORMATION',   // 허위 정보
  OTHER = 'OTHER',                     // 기타 사유
}
