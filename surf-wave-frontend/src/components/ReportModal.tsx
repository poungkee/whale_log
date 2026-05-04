/**
 * @file ReportModal.tsx
 * @description 콘텐츠 신고 모달 (Phase 2D)
 *
 * 사용처:
 * - 다이어리 신고 (POST /api/v1/diary/:id/report)
 * - (확장 가능) 게시글/댓글 신고
 *
 * 사용자 흐름:
 * 1. 신고 사유 5개 중 1개 선택
 * 2. (선택) 부가 설명 입력 (최대 500자)
 * 3. 제출 → 토스트 안내 + 모달 닫기
 *
 * 백엔드 응답 처리:
 * - 200: 정상 접수
 * - 400: 본인 다이어리 신고 시도
 * - 403: 비공개 다이어리 신고 시도
 * - 409: 중복 신고
 *
 * 사용자에게는 신고 사실이 작성자에게 알려지지 않음을 명시 (보복 방지 신뢰 형성)
 */

import { useState } from 'react';
import { X, Flag, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

/** 신고 사유 — 백엔드 ReportReason enum과 1:1 일치 */
const REPORT_REASONS = [
  { value: 'SPAM',           label: '스팸/광고',          desc: '반복 광고, 도배성 게시물' },
  { value: 'HARASSMENT',     label: '괴롭힘/욕설',        desc: '특정 인물 비방, 욕설' },
  { value: 'INAPPROPRIATE',  label: '부적절한 콘텐츠',    desc: '선정적, 폭력적 이미지/내용' },
  { value: 'MISINFORMATION', label: '허위 정보',          desc: '거짓 정보, 사기' },
  { value: 'OTHER',          label: '기타',               desc: '위 항목에 해당하지 않는 사유' },
] as const;

type ReportReason = typeof REPORT_REASONS[number]['value'];

interface ReportModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /**
   * 신고 대상 종류 — 표시 문구만 다름
   * - 'diary': "이 다이어리를 신고하시겠습니까?"
   */
  targetType: 'diary';
  /** 신고 대상 ID */
  targetId: string;
  /** 신고 성공 콜백 (선택) */
  onSubmitted?: () => void;
}

export function ReportModal({ open, onClose, targetType, targetId, onSubmitted }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** 모달 닫을 때 입력 초기화 */
  const handleClose = () => {
    setReason('');
    setDescription('');
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      /** JWT 토큰 (App.tsx 인증 흐름과 동일) */
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setErrorMsg('로그인이 필요합니다');
        setSubmitting(false);
        return;
      }

      /** 다이어리 신고 엔드포인트 — Phase 2D 백엔드 라우트 */
      const url = targetType === 'diary' ? `/api/v1/diary/${targetId}/report` : '';
      const res = await fetch(api(url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, description: description || undefined }),
      });

      if (res.ok) {
        alert('신고가 접수되었습니다. 검토 후 조치합니다.');
        onSubmitted?.();
        handleClose();
      } else {
        /** 백엔드 에러 메시지 한국어 표시 — 시나리오의 B-3/B-4/B-5 케이스 처리 */
        const data = await res.json().catch(() => ({}));
        const msg = data.message || (
          res.status === 400 ? '본인의 다이어리는 신고할 수 없습니다' :
          res.status === 403 ? '비공개 다이어리는 신고할 수 없습니다' :
          res.status === 409 ? '이미 신고 접수된 다이어리입니다' :
          res.status === 401 ? '로그인이 필요합니다' :
          '신고 접수 중 문제가 발생했습니다'
        );
        setErrorMsg(typeof msg === 'string' ? msg : '신고 접수에 실패했습니다');
      }
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            <h2 className="text-base font-bold">다이어리 신고</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 안내문 */}
        <div className="p-4 pb-2">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              신고 내용은 관리자만 확인하며, <strong>작성자에게는 알려지지 않습니다</strong>.
              검토 후 가이드라인 위반이 확인되면 숨김 처리됩니다.
            </p>
          </div>
        </div>

        {/* 사유 선택 */}
        <div className="px-4 pb-3">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">신고 사유 선택 *</h3>
          <div className="space-y-1.5">
            {REPORT_REASONS.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                  reason === r.value
                    ? 'border-destructive bg-destructive/10'
                    : 'border-border bg-card hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                    reason === r.value ? 'border-destructive bg-destructive' : 'border-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 부가 설명 */}
        <div className="px-4 pb-3">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">
            상세 설명 (선택, {description.length}/500)
          </h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="구체적인 사유나 위반 내용을 적어주시면 빠른 검토에 도움이 됩니다"
            rows={3}
            className="w-full bg-secondary/30 border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* 에러 메시지 */}
        {errorMsg && (
          <div className="px-4 pb-3">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 text-xs text-destructive">
              {errorMsg}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="p-4 border-t border-border flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-border hover:bg-secondary transition-colors"
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '접수 중...' : '신고하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
