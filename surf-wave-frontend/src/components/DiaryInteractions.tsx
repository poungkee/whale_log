/**
 * @file DiaryInteractions.tsx
 * @description 다이어리 카드용 도움됐어요 + 댓글 인터랙션 (Phase 2C)
 *
 * - ✋ 도움됐어요 토글 + 카운트
 * - 💬 댓글 토글 → 펼치면 목록 + 작성 폼
 * - 인증 안 된 사용자는 토글 시 로그인 안내
 */
import { useEffect, useState } from 'react';
import { ThumbsUp, MessageCircle, Loader2, Send, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

interface DiaryInteractionsProps {
  diaryId: string;
}

interface CommentItem {
  id: string;
  content: string;
  authorId: string;
  parentId: string | null;
  depth: number;
  createdAt: string;
  author?: { id: string; username: string | null; avatarUrl: string | null };
}

export function DiaryInteractions({ diaryId }: DiaryInteractionsProps) {
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [helpful, setHelpful] = useState(false);
  const [helpfulLoading, setHelpfulLoading] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** 마운트 시 도움됐어요 상태 조회 (인증된 경우만) */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch(api(`/api/v1/diaries/${diaryId}/helpful`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setHelpfulCount(d.count ?? 0);
          setHelpful(!!d.helpful);
        }
      })
      .catch(() => {});
  }, [diaryId]);

  /** 댓글 목록 lazy 로드 — 펼칠 때만 호출 */
  const loadComments = async () => {
    if (commentsLoaded) return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setCommentsLoaded(true);
      return;
    }
    try {
      const res = await fetch(api(`/api/v1/diaries/${diaryId}/comments`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setCommentsLoaded(true);
    }
  };

  /** 댓글 펼침/접힘 토글 */
  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next) loadComments();
  };

  /** 도움됐어요 토글 */
  const handleHelpful = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다');
      return;
    }
    setHelpfulLoading(true);
    try {
      const res = await fetch(api(`/api/v1/diaries/${diaryId}/helpful/toggle`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setHelpful(!!d.helpful);
        setHelpfulCount(d.count ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setHelpfulLoading(false);
    }
  };

  /** 댓글 작성 */
  const handleSubmit = async () => {
    if (!commentInput.trim()) return;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(api(`/api/v1/diaries/${diaryId}/comments`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentInput('');
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  /** 댓글 삭제 (본인만 — 백엔드에서 검증) */
  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제할까요?')) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await fetch(api(`/api/v1/diaries/${diaryId}/comments/${commentId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      /* ignore */
    }
  };

  /** 본인 댓글 식별 — JWT의 sub 또는 localStorage 사용자 정보 */
  const myUserId = (() => {
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      return userInfoStr ? JSON.parse(userInfoStr).id : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="border-t border-border/40 pt-2 mt-2">
      {/* 액션 버튼 행 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleHelpful}
          disabled={helpfulLoading}
          className={`flex items-center gap-1 text-[11px] transition-colors ${
            helpful ? 'text-primary font-bold' : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <ThumbsUp className={`w-3 h-3 ${helpful ? 'fill-primary' : ''}`} />
          도움됐어요 {helpfulCount > 0 && helpfulCount}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          댓글 {comments.length > 0 && comments.length}
        </button>
      </div>

      {/* 댓글 영역 (펼친 상태) */}
      {showComments && (
        <div className="mt-2 space-y-1.5">
          {!commentsLoaded && (
            <div className="text-center py-2">
              <Loader2 className="w-3 h-3 animate-spin inline" />
            </div>
          )}

          {commentsLoaded && comments.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              첫 댓글을 남겨보세요!
            </p>
          )}

          {comments.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-2 text-[11px] bg-secondary/40 rounded p-2"
            >
              <span className="font-bold min-w-0">
                {c.author?.username || '?'}
              </span>
              <span className="flex-1 min-w-0 break-words">{c.content}</span>
              {c.authorId === myUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  aria-label="삭제"
                >
                  <Trash2 className="w-2.5 h-2.5 text-destructive" />
                </button>
              )}
            </div>
          ))}

          {/* 댓글 입력 */}
          <div className="flex items-center gap-1 mt-1">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="댓글..."
              maxLength={500}
              className="flex-1 px-2 py-1.5 text-[11px] bg-secondary/40 border border-border rounded
                         focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !commentInput.trim()}
              className="p-1.5 bg-primary/10 hover:bg-primary/20 rounded text-primary disabled:opacity-40"
              aria-label="작성"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
