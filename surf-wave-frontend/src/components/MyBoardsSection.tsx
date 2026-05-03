/**
 * @file MyBoardsSection.tsx
 * @description 마이페이지 프로필 탭의 "내 보드" 섹션
 *
 * - GET /api/v1/user-boards/me 로 보드 목록 조회
 * - POST/PATCH/DELETE 로 추가/수정/삭제
 * - 메인 보드는 ⭐ 표시 + 다른 보드 클릭 시 "메인으로" 토글
 * - 처음 등록 시 자동 메인 (백엔드 처리)
 */
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Star, X } from 'lucide-react';
import type { BoardType } from '../types';
import { api } from '../lib/api';

interface UserBoard {
  id: string;
  nickname: string;
  boardType: BoardType;
  sizeFt: number | null;
  isPrimary: boolean;
  notes: string | null;
}

const BOARD_LABELS: Record<BoardType, string> = {
  LONGBOARD: '롱보드', FUNBOARD: '펀보드', MIDLENGTH: '미드렝스', FISH: '피쉬',
  SHORTBOARD: '숏보드', SUP: 'SUP', BODYBOARD: '바디보드', FOIL: '포일',
  OTHER: '기타', UNSET: '미설정',
};
const BOARD_COLORS: Record<BoardType, string> = {
  LONGBOARD: '#32CD32', FUNBOARD: '#008CBA', MIDLENGTH: '#6366F1', FISH: '#EC4899',
  SHORTBOARD: '#FF8C00', SUP: '#14B8A6', BODYBOARD: '#8B5CF6', FOIL: '#0EA5E9',
  OTHER: '#6B7280', UNSET: '#888888',
};
const SELECTABLE_BOARDS: BoardType[] = [
  'LONGBOARD', 'FUNBOARD', 'MIDLENGTH', 'FISH',
  'SHORTBOARD', 'SUP', 'BODYBOARD', 'FOIL', 'OTHER',
];

export function MyBoardsSection() {
  const [boards, setBoards] = useState<UserBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserBoard | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  /** 보드 목록 조회 */
  const fetchBoards = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(api('/api/v1/user-boards/me'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setBoards(await res.json());
    } catch {
      console.warn('보드 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoards(); }, []);

  /** 메인 보드 변경 — PATCH isPrimary=true */
  const handleSetPrimary = async (boardId: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await fetch(api(`/api/v1/user-boards/${boardId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (res.ok) await fetchBoards();
    } catch { /* ignore */ }
  };

  /** 보드 삭제 */
  const handleDelete = async (boardId: string) => {
    if (!confirm('이 보드를 삭제할까요?')) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      await fetch(api(`/api/v1/user-boards/${boardId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      await fetchBoards();
    } catch { /* ignore */ }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          🏄 내 보드
          {boards.length > 0 && (
            <span className="text-xs text-muted-foreground font-medium">{boards.length}개</span>
          )}
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-lg font-medium hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3 h-3" /> 추가
        </button>
      </div>

      {/* 추천 메커니즘 안내 — 사용자가 보드 등록 동기 부여 + 렌탈/강습 보드도 OK */}
      <div className="text-[11px] text-muted-foreground leading-relaxed mb-3 px-2 py-1.5 bg-primary/5 rounded-md">
        💡 <span className="font-medium">레벨과 메인 보드에 따라 파도가 추천돼요</span>
        <br />
        본인 보드 외에 자주 타는 강습/렌탈 보드도 등록해보세요
      </div>

      {loading && (
        <div className="text-xs text-muted-foreground text-center py-3">불러오는 중...</div>
      )}

      {!loading && boards.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">
          아직 등록된 보드가 없어요. 추가해보세요!
        </div>
      )}

      {!loading && boards.length > 0 && (
        <div className="space-y-2">
          {boards.map((board) => (
            <div
              key={board.id}
              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                board.isPrimary ? 'border-primary/40 bg-primary/5' : 'border-border'
              }`}
            >
              {/* 메인 표시 / 메인 변경 버튼 */}
              <button
                onClick={() => !board.isPrimary && handleSetPrimary(board.id)}
                className={`flex-shrink-0 ${board.isPrimary ? 'cursor-default' : 'cursor-pointer hover:opacity-70'}`}
                title={board.isPrimary ? '현재 메인 보드' : '메인으로 변경'}
              >
                <Star
                  className="w-4 h-4"
                  fill={board.isPrimary ? '#FCD34D' : 'none'}
                  stroke={board.isPrimary ? '#FCD34D' : '#94A3B8'}
                />
              </button>

              {/* 이름 + 보드 타입 + 길이 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{board.nickname}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${BOARD_COLORS[board.boardType]}20`,
                      color: BOARD_COLORS[board.boardType],
                    }}
                  >
                    {BOARD_LABELS[board.boardType]}
                  </span>
                  {board.sizeFt && (
                    <span className="text-[10px] text-muted-foreground">{board.sizeFt}ft</span>
                  )}
                </div>
              </div>

              {/* 수정/삭제 버튼 */}
              <button
                onClick={() => setEditing(board)}
                className="p-1.5 hover:bg-secondary rounded transition-colors"
                aria-label="수정"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => handleDelete(board.id)}
                className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                aria-label="삭제"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {(showAddModal || editing) && (
        <BoardEditModal
          board={editing}
          onClose={() => { setShowAddModal(false); setEditing(null); }}
          onSaved={() => { setShowAddModal(false); setEditing(null); fetchBoards(); }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// 보드 추가/수정 모달 (인라인 컴포넌트)
// ───────────────────────────────────────────────────────────
function BoardEditModal({
  board,
  onClose,
  onSaved,
}: {
  board: UserBoard | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nickname, setNickname] = useState(board?.nickname ?? '');
  const [boardType, setBoardType] = useState<BoardType>(board?.boardType ?? 'LONGBOARD');
  const [sizeFt, setSizeFt] = useState(board?.sizeFt?.toString() ?? '');
  const [isPrimary, setIsPrimary] = useState(board?.isPrimary ?? false);
  const [notes, setNotes] = useState(board?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!board;

  const handleSave = async () => {
    if (!nickname.trim()) {
      setError('보드 별명을 입력해주세요');
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setSaving(true);
    setError(null);
    const ftValue = sizeFt.trim() ? parseFloat(sizeFt) : null;
    const body = {
      nickname: nickname.trim(),
      boardType,
      sizeFt: ftValue,
      isPrimary,
      notes: notes.trim() || null,
    };
    try {
      const url = isEdit ? `/api/v1/user-boards/${board!.id}` : '/api/v1/user-boards';
      const res = await fetch(api(url), {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || '저장에 실패했어요');
        return;
      }
      onSaved();
    } catch {
      setError('저장 중 오류가 발생했어요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-sm p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">{isEdit ? '보드 수정' : '보드 추가'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 별명 */}
        <label className="text-xs text-muted-foreground mb-1 block">별명 (필수)</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="예: 메인 롱보드"
          maxLength={30}
          className="w-full px-3 py-2 mb-3 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        {/* 보드 타입 */}
        <label className="text-xs text-muted-foreground mb-1 block">보드 타입</label>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {SELECTABLE_BOARDS.map((bt) => (
            <button
              key={bt}
              onClick={() => setBoardType(bt)}
              className={`px-2 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                boardType === bt
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
              style={{ color: boardType === bt ? BOARD_COLORS[bt] : undefined }}
            >
              {BOARD_LABELS[bt]}
            </button>
          ))}
        </div>

        {/* 길이 */}
        <label className="text-xs text-muted-foreground mb-1 block">보드 길이 (선택)</label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            value={sizeFt}
            onChange={(e) => setSizeFt(e.target.value)}
            placeholder="예: 6.2"
            min={3.0}
            max={12.0}
            step={0.1}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-sm text-muted-foreground">ft</span>
        </div>

        {/* 메모 */}
        <label className="text-xs text-muted-foreground mb-1 block">메모 (선택)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="예: 빨간색 / 여행용"
          maxLength={200}
          className="w-full px-3 py-2 mb-3 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        {/* 메인 보드 토글 */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">메인 보드로 설정</span>
        </label>

        {error && (
          <div className="text-xs text-destructive mb-3">{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !nickname.trim()}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          {saving ? '저장 중...' : (isEdit ? '저장' : '추가')}
        </button>
      </div>
    </div>
  );
}
