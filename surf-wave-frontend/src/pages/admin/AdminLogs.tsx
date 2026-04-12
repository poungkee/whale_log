/**
 * @file AdminLogs.tsx
 * @description 관리자 감사 로그 탭 — 관리자 액션 이력 조회
 *
 * API 호출:
 * - GET /api/v1/admin/logs?page=1&limit=20
 *
 * 표시 항목:
 * - 액션 타입 (정지/해제/역할변경/게시글숨김 등)
 * - 대상 (유저/게시글/스팟 등)
 * - 설명
 * - 실행 관리자
 * - IP 주소
 * - 실행 시각
 */

import { useEffect, useState } from 'react';
import { Shield, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import type { AdminLog } from '../../types';
import { api } from '../../lib/api';

interface AdminLogsProps {
  /** JWT 액세스 토큰 — API 인증에 사용 */
  token: string;
}

/** 로그 목록 API 응답 구조 */
interface LogsResponse {
  data: AdminLog[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 액션 타입을 한국어로 변환
 */
const ACTION_LABELS: Record<string, string> = {
  SUSPEND_USER: '유저 정지',
  UNSUSPEND_USER: '정지 해제',
  CHANGE_ROLE: '역할 변경',
  HIDE_POST: '게시글 숨김',
  SHOW_POST: '게시글 노출',
  DELETE_SPOT: '스팟 삭제',
  DELETE_GUIDE: '가이드 삭제',
  RESOLVE_REPORT: '신고 처리',
  BROADCAST: '전체 공지',
};

/**
 * 액션 타입별 배지 색상
 */
function actionColor(type: string): string {
  if (type.includes('SUSPEND') || type.includes('HIDE') || type.includes('DELETE')) {
    return 'bg-red-500/20 text-red-400';
  }
  if (type.includes('UNSUSPEND') || type.includes('SHOW')) {
    return 'bg-green-500/20 text-green-400';
  }
  return 'bg-secondary text-muted-foreground';
}

/**
 * ISO 날짜 문자열을 '4/12 10:30' 형식으로 변환
 */
function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function AdminLogs({ token }: AdminLogsProps) {
  /** 로그 목록 */
  const [logs, setLogs] = useState<AdminLog[]>([]);
  /** 전체 로그 수 */
  const [total, setTotal] = useState(0);
  /** 현재 페이지 */
  const [page, setPage] = useState(1);
  /** 로딩 상태 */
  const [loading, setLoading] = useState(false);

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
        const res = await fetch(api(`/api/v1/admin/logs?${params}`), {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error('감사 로그 조회 실패:', res.status);
          return;
        }

        const data: LogsResponse = await res.json();
        setLogs(data.data);
        setTotal(data.total);
      } catch {
        console.error('서버 연결 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [token, page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">감사 로그</h2>
        <span className="text-sm text-muted-foreground">총 {total.toLocaleString('ko-KR')}건</span>
      </div>

      {/* 로그 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          감사 로그가 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-card border border-border rounded-xl p-3">
              {/* 상단: 액션 배지 + 시각 */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${actionColor(log.actionType)}`}>
                  <Shield className="w-3 h-3" />
                  {ACTION_LABELS[log.actionType] ?? log.actionType}
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
              </div>

              {/* 설명 */}
              {log.description && (
                <p className="text-sm text-foreground mb-1">{log.description}</p>
              )}

              {/* 메타 정보 */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {/* 대상 타입 + ID */}
                {log.targetType && (
                  <span>대상: {log.targetType} {log.targetId ? `(${log.targetId.slice(0, 8)}...)` : ''}</span>
                )}
                {/* 실행 관리자 */}
                {log.admin && (
                  <span>관리자: {log.admin.nickname}</span>
                )}
                {/* IP 주소 */}
                {log.ipAddress && (
                  <span>IP: {log.ipAddress}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg bg-card border border-border disabled:opacity-40 hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg bg-card border border-border disabled:opacity-40 hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
