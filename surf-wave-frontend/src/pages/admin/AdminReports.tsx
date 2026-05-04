/**
 * @file AdminReports.tsx
 * @description 관리자 신고 처리 탭 (Phase 2D 신규)
 *
 * 기능:
 * - 신고 목록 조회 (GET /admin/reports) — 게시글/댓글/다이어리 신고 통합
 * - 처리 액션:
 *   1. RESOLVED 처리 + 다이어리 숨김 (PATCH /admin/diaries/:id/hide → 작성자 알림 자동 발송)
 *   2. RESOLVED 처리 + 게시글 숨김 (PATCH /admin/posts/:id/hide)
 *   3. DISMISSED 처리 (가이드라인 위반 아님, 콘텐츠 그대로)
 * - 처리 시 관리자 메모 입력 → 작성자에게 발송되는 CONTENT_HIDDEN 알림 본문에 포함
 *
 * 시나리오 매핑:
 * - Step 8: 관리자 신고 목록 조회
 * - Step 10-가: 처분 (가이드라인 위반 인정)
 * - Step 10-나: 기각 (신고 부당)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, EyeOff, CheckCircle, XCircle, Loader2,
  ChevronLeft, ChevronRight, Flag, MessageSquare, BookOpen, FileText,
} from 'lucide-react';
import { api } from '../../lib/api';

interface AdminReportsProps {
  /** JWT 액세스 토큰 */
  token: string;
}

/** 신고 사유 한국어 매핑 */
const REASON_KO: Record<string, string> = {
  SPAM: '스팸/광고',
  HARASSMENT: '괴롭힘/욕설',
  INAPPROPRIATE: '부적절',
  MISINFORMATION: '허위 정보',
  OTHER: '기타',
};

/** 신고 상태 한국어 + 색상 매핑 */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: '대기',      color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  REVIEWED:  { label: '검토 중',   color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  RESOLVED:  { label: '처분 완료', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  DISMISSED: { label: '기각',      color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' },
};

/** 백엔드 응답 구조 (Report + relations) */
interface ReportItem {
  id: string;
  reason: string;
  description: string | null;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; username: string | null; email: string };
  /** 셋 중 하나만 채워짐 */
  post: { id: string; content: string } | null;
  comment: { id: string; content: string } | null;
  diary: {
    id: string;
    memo: string | null;
    surfDate: string;
    isHidden: boolean;
    user: { id: string; username: string | null };
  } | null;
}

export function AdminReports({ token }: AdminReportsProps) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('PENDING');

  /** 처리 모달 상태 */
  const [resolveTarget, setResolveTarget] = useState<ReportItem | null>(null);
  const [resolveAction, setResolveAction] = useState<'hide' | 'dismiss'>('hide');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const limit = 20;

  /** 신고 목록 조회 */
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(api(`/api/v1/admin/reports?page=${page}&limit=${limit}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = (data.data ?? []) as ReportItem[];
        /** 상태 필터링 (백엔드는 status 필터 미지원 — 프론트에서 필터) */
        const filtered = statusFilter === 'ALL'
          ? items
          : items.filter(r => r.status === statusFilter);
        setReports(filtered);
        setTotal(data.meta?.totalItems ?? 0);
      }
    } catch (err) {
      console.error('신고 목록 조회 실패', err);
    } finally {
      setLoading(false);
    }
  }, [page, token, statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  /** 처리 모달 열기 */
  const openResolveModal = (report: ReportItem, action: 'hide' | 'dismiss') => {
    setResolveTarget(report);
    setResolveAction(action);
    setAdminNote('');
  };

  /** 처리 실행 */
  const handleResolve = async () => {
    if (!resolveTarget) return;
    setSubmitting(true);
    try {
      const isHide = resolveAction === 'hide';

      /** ① 컨텐츠 숨김 (다이어리 또는 게시글) — 작성자 알림 자동 발송 */
      if (isHide) {
        if (resolveTarget.diary) {
          await fetch(api(`/api/v1/admin/diaries/${resolveTarget.diary.id}/hide`), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isHidden: true, adminNote: adminNote || undefined }),
          });
        } else if (resolveTarget.post) {
          await fetch(api(`/api/v1/admin/posts/${resolveTarget.post.id}/hide`), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isHidden: true }),
          });
        }
      }

      /** ② 신고 상태 업데이트 — RESOLVED 또는 DISMISSED */
      await fetch(api(`/api/v1/admin/reports/${resolveTarget.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: isHide ? 'RESOLVED' : 'DISMISSED',
          adminNote: adminNote || undefined,
        }),
      });

      alert(isHide ? '컨텐츠가 숨김 처리되었고 작성자에게 알림이 발송되었습니다' : '신고가 기각되었습니다');
      setResolveTarget(null);
      fetchReports();
    } catch (err) {
      alert('처리 중 오류가 발생했습니다');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /** 신고 대상 종류 아이콘 */
  const getTargetIcon = (r: ReportItem) => {
    if (r.diary) return <BookOpen className="w-4 h-4 text-purple-400" />;
    if (r.post) return <FileText className="w-4 h-4 text-blue-400" />;
    if (r.comment) return <MessageSquare className="w-4 h-4 text-green-400" />;
    return <Flag className="w-4 h-4 text-gray-400" />;
  };

  /** 신고 대상 종류 라벨 */
  const getTargetType = (r: ReportItem) => {
    if (r.diary) return '다이어리';
    if (r.post) return '게시글';
    if (r.comment) return '댓글';
    return '?';
  };

  /** 신고 대상 미리보기 */
  const getTargetPreview = (r: ReportItem) => {
    if (r.diary) {
      const memo = r.diary.memo || '(메모 없음)';
      const author = r.diary.user.username || '익명';
      return `${author} · ${memo.slice(0, 50)}${memo.length > 50 ? '…' : ''}`;
    }
    if (r.post) return r.post.content.slice(0, 60);
    if (r.comment) return r.comment.content.slice(0, 60);
    return '-';
  };

  return (
    <div>
      {/* 상태 필터 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'ALL' ? '전체' : STATUS_CONFIG[s]?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {statusFilter === 'PENDING' ? '미처리 신고가 없습니다' : '신고가 없습니다'}
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => {
            const statusCfg = STATUS_CONFIG[r.status];
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-lg p-3"
              >
                {/* 상단: 대상 종류 + 사유 + 상태 */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {getTargetIcon(r)}
                  <span className="text-xs font-semibold">{getTargetType(r)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
                    {REASON_KO[r.reason] || r.reason}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ color: statusCfg?.color, backgroundColor: statusCfg?.bg }}
                  >
                    {statusCfg?.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(r.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>

                {/* 신고 대상 미리보기 */}
                <div className="bg-secondary/30 rounded p-2 mb-2 text-xs">
                  <p className="text-muted-foreground line-clamp-2">{getTargetPreview(r)}</p>
                </div>

                {/* 신고자 + 설명 */}
                <div className="text-[11px] text-muted-foreground mb-2">
                  <span className="font-semibold">신고자:</span> {r.reporter.username || r.reporter.email}
                  {r.description && (
                    <p className="mt-1">
                      <span className="font-semibold">사유 설명:</span> {r.description}
                    </p>
                  )}
                </div>

                {/* 처리된 신고: 관리자 메모 표시 */}
                {(r.status === 'RESOLVED' || r.status === 'DISMISSED') && r.adminNote && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mb-2">
                    <p className="text-[11px] text-blue-300">
                      <span className="font-semibold">관리자 메모:</span> {r.adminNote}
                    </p>
                  </div>
                )}

                {/* 액션 버튼 (PENDING만) */}
                {r.status === 'PENDING' && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {(r.diary || r.post) && (
                      <button
                        onClick={() => openResolveModal(r, 'hide')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold bg-destructive text-white hover:bg-destructive/90"
                      >
                        <EyeOff className="w-3 h-3" />
                        숨김 + 처분
                      </button>
                    )}
                    <button
                      onClick={() => openResolveModal(r, 'dismiss')}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold bg-secondary hover:bg-secondary/80"
                    >
                      <XCircle className="w-3 h-3" />
                      기각
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4 px-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded hover:bg-secondary disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {page} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * limit >= total}
            className="p-1.5 rounded hover:bg-secondary disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 처리 모달 */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-border flex items-center gap-2">
              {resolveAction === 'hide' ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
              )}
              <h2 className="font-bold">
                {resolveAction === 'hide' ? '컨텐츠 숨김 처분' : '신고 기각'}
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-secondary/30 rounded p-2 text-xs">
                <p className="text-muted-foreground line-clamp-3">{getTargetPreview(resolveTarget)}</p>
              </div>

              {resolveAction === 'hide' ? (
                <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-xs text-destructive">
                  ⚠️ 이 컨텐츠를 숨김 처리하고 작성자에게 알림이 발송됩니다.
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 text-xs text-blue-300">
                  ℹ️ 신고를 기각합니다. 작성자에게는 알리지 않습니다.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  관리자 메모 ({resolveAction === 'hide' ? '작성자 알림에 포함됨' : '내부 기록용'})
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder={resolveAction === 'hide' ? '예: 노출 사진 가이드라인 9.2 위반' : '예: 신고 사유에 해당하지 않음'}
                  className="w-full bg-secondary/30 border border-border rounded p-2 text-xs focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <button
                onClick={() => setResolveTarget(null)}
                disabled={submitting}
                className="flex-1 py-2 rounded text-xs font-semibold border border-border hover:bg-secondary"
              >
                취소
              </button>
              <button
                onClick={handleResolve}
                disabled={submitting}
                className={`flex-1 py-2 rounded text-xs font-semibold text-white ${
                  resolveAction === 'hide' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
                } disabled:opacity-40`}
              >
                {submitting ? '처리 중...' : resolveAction === 'hide' ? '숨김 처분' : '기각'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
