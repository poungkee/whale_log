/**
 * @file notification-type.enum.ts
 * @description 푸시 알림 종류 열거형
 *
 * FCM(Firebase Cloud Messaging)으로 전송되는 알림의 종류를 분류합니다.
 */
export enum NotificationType {
  COMMENT = 'COMMENT',                 // 내 게시글에 새 댓글이 달림
  REPLY = 'REPLY',                     // 내 댓글에 대댓글이 달림
  LIKE = 'LIKE',                       // 내 게시글에 좋아요가 눌림
  ANSWER = 'ANSWER',                   // 내 질문에 새 답변이 달림
  CONDITION_ALERT = 'CONDITION_ALERT', // 설정한 파도 조건에 맞는 예보 알림
  SYSTEM = 'SYSTEM',                   // 시스템 알림 (서비스 점검 등)
  BROADCAST = 'BROADCAST',             // 전체 공지 알림 (관리자가 전송)
  /**
   * 콘텐츠 처분 알림 (Phase 2D 신고 시스템)
   * 내 게시물/다이어리가 가이드라인 위반으로 관리자에 의해 숨김 처리될 때 발송
   * - title 예: "다이어리가 숨김 처리되었습니다"
   * - body  예: "회원님의 다이어리가 커뮤니티 가이드라인 위반으로 숨김 처리되었습니다. 사유: ..."
   * - data  예: { contentType: 'DIARY', contentId: '...', adminNote: '...' }
   */
  CONTENT_HIDDEN = 'CONTENT_HIDDEN',
}
