/**
 * @file report-status.enum.ts
 * @description 신고 처리 상태 열거형
 *
 * 관리자가 신고를 처리하는 워크플로우 상태를 나타냅니다.
 * PENDING → REVIEWED → RESOLVED 또는 DISMISSED
 */
export enum ReportStatus {
  PENDING = 'PENDING',       // 대기 중 - 아직 검토되지 않은 신고
  REVIEWED = 'REVIEWED',     // 검토 중 - 관리자가 확인 중
  RESOLVED = 'RESOLVED',     // 처리 완료 - 조치가 취해짐 (콘텐츠 삭제, 사용자 제재 등)
  DISMISSED = 'DISMISSED',   // 기각 - 신고 사유가 부적절하여 조치 없이 종료
}
