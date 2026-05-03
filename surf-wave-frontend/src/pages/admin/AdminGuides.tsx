/**
 * @file AdminGuides.tsx
 * @description 관리자 가이드 관리 탭 — 가이드 목록 조회, 생성, 수정, 삭제
 *
 * API:
 * - GET    /api/v1/guides              — 가이드 목록 조회 (인증 필요)
 * - POST   /api/v1/admin/guides        — 가이드 생성
 * - PATCH  /api/v1/admin/guides/:id    — 가이드 수정
 * - DELETE /api/v1/admin/guides/:id    — 가이드 삭제
 *
 * 카테고리 enum (백엔드 GuideCategory와 일치):
 * BEGINNER / TECHNIQUE / SAFETY / EQUIPMENT / ETIQUETTE / WEATHER
 */

import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Edit3, X, Check, EyeOff } from 'lucide-react';
import { api } from '../../lib/api';

interface AdminGuidesProps {
  /** JWT 액세스 토큰 — API 인증에 사용 */
  token: string;
}

/** 가이드 항목 (목록 + 폼 공통 구조) */
interface GuideItem {
  id: string;
  title: string;
  content: string;
  category: string;
  thumbnailUrl: string | null;
  sortOrder: number;
  estimatedReadMinutes: number;
  isPublished: boolean;
}

interface GuideFormData {
  title: string;
  content: string;
  category: string;
  thumbnailUrl: string;
  sortOrder: number;
  estimatedReadMinutes: number;
  isPublished: boolean;
}

const EMPTY_FORM: GuideFormData = {
  title: '',
  content: '',
  category: 'BEGINNER',
  thumbnailUrl: '',
  sortOrder: 0,
  estimatedReadMinutes: 3,
  isPublished: true,
};

/** 백엔드 enum → 한국어 라벨 매핑 */
const CATEGORY_LABELS: Record<string, string> = {
  BEGINNER:  '입문 (BEGINNER)',
  TECHNIQUE: '기술 (TECHNIQUE)',
  SAFETY:    '안전 (SAFETY)',
  EQUIPMENT: '장비 (EQUIPMENT)',
  ETIQUETTE: '에티켓 (ETIQUETTE)',
  WEATHER:   '날씨 (WEATHER)',
};

export function AdminGuides({ token }: AdminGuidesProps) {
  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  /** 폼 표시 여부 (null=숨김, 'create'=생성, guideId=수정) */
  const [formMode, setFormMode] = useState<null | 'create' | string>(null);
  const [form, setForm] = useState<GuideFormData>(EMPTY_FORM);
  const [processing, setProcessing] = useState(false);
  /** 카테고리 필터 (전체 또는 특정 카테고리) */
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  /** 가이드 목록 조회 (GET /api/v1/guides — 인증 필요) */
  const fetchGuides = async () => {
    setLoading(true);
    try {
      const res = await fetch(api('/api/v1/guides?limit=200'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('가이드 목록 조회 실패:', res.status);
        return;
      }
      const data = await res.json();
      /** 응답 구조: { data: [...], total, page, limit } 또는 배열 */
      setGuides(
        Array.isArray(data)
          ? data
          : data.data ?? data.guides ?? [],
      );
    } catch {
      console.error('가이드 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  /** 생성 폼 열기 */
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormMode('create');
  };

  /** 수정 폼 열기 — 기존 데이터로 폼 초기화 */
  const openEdit = (guide: GuideItem) => {
    setForm({
      title: guide.title,
      content: guide.content,
      category: guide.category,
      thumbnailUrl: guide.thumbnailUrl ?? '',
      sortOrder: guide.sortOrder,
      estimatedReadMinutes: guide.estimatedReadMinutes,
      isPublished: guide.isPublished,
    });
    setFormMode(guide.id);
  };

  const closeForm = () => setFormMode(null);

  /** 가이드 저장 (생성 또는 수정) */
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('제목과 내용은 필수입니다.');
      return;
    }
    setProcessing(true);
    try {
      const isCreate = formMode === 'create';
      const url = isCreate
        ? api('/api/v1/admin/guides')
        : api(`/api/v1/admin/guides/${formMode}`);
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
          thumbnailUrl: form.thumbnailUrl.trim() || null,
          sortOrder: form.sortOrder,
          estimatedReadMinutes: form.estimatedReadMinutes,
          isPublished: form.isPublished,
        }),
      });
      if (res.ok) {
        closeForm();
        await fetchGuides();
      } else {
        const err = await res.json().catch(() => null);
        alert(`저장 실패: ${err?.message ?? '알 수 없는 오류'}`);
      }
    } catch {
      alert('서버 연결 실패');
    } finally {
      setProcessing(false);
    }
  };

  /** 가이드 삭제 (하드 삭제 — 복구 불가) */
  const handleDelete = async (guideId: string, title: string) => {
    if (!confirm(`"${title}" 가이드를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setProcessing(true);
    try {
      const res = await fetch(api(`/api/v1/admin/guides/${guideId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setGuides(prev => prev.filter(g => g.id !== guideId));
      } else {
        alert('삭제 실패');
      }
    } catch {
      alert('서버 연결 실패');
    } finally {
      setProcessing(false);
    }
  };

  /** 카테고리 필터 적용된 가이드 목록 */
  const filteredGuides = categoryFilter === 'ALL'
    ? guides
    : guides.filter(g => g.category === categoryFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">가이드 관리</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
                     rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          가이드 추가
        </button>
      </div>

      {/* 카테고리 필터 칩 */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
            categoryFilter === 'ALL'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          전체
        </button>
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setCategoryFilter(k)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              categoryFilter === k
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {v.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* 생성/수정 폼 */}
      {formMode !== null && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">
              {formMode === 'create' ? '새 가이드 추가' : '가이드 수정'}
            </h3>
            <button onClick={closeForm} className="p-1 rounded hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="예: 드롭인 금지 (Drop-in)"
              maxLength={200}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">카테고리</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* 내용 (마크다운/일반 텍스트 둘 다 가능) */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">내용 *</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="가이드 본문 (줄바꿈 보존, 마크다운 가능)"
              rows={10}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {form.content.length}자 / 약 {Math.max(1, Math.ceil(form.content.length / 200))}분 읽기
            </p>
          </div>

          {/* 정렬 순서 + 예상 읽기 시간 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">정렬 순서</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">예상 읽기 (분)</label>
              <input
                type="number"
                value={form.estimatedReadMinutes}
                onChange={e => setForm(f => ({ ...f, estimatedReadMinutes: parseInt(e.target.value) || 1 }))}
                min={1}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* 썸네일 URL (선택) */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">썸네일 URL (선택)</label>
            <input
              type="text"
              value={form.thumbnailUrl}
              onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* 공개 여부 토글 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm">공개 (체크 해제 시 사용자에게 안 보임)</span>
          </label>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-2 bg-primary
                       text-primary-foreground rounded-lg text-sm font-medium
                       hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {processing ? '저장 중...' : '저장'}
          </button>
        </div>
      )}

      {/* 가이드 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {categoryFilter === 'ALL'
            ? '가이드가 없습니다. 우측 상단 "가이드 추가"로 등록하세요.'
            : '이 카테고리에 가이드가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">총 {filteredGuides.length}개 가이드</p>
          {filteredGuides.map(guide => (
            <div key={guide.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              {/* 가이드 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{guide.title}</span>
                  {!guide.isPublished && (
                    <EyeOff className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>{CATEGORY_LABELS[guide.category]?.split(' ')[0] ?? guide.category}</span>
                  <span>·</span>
                  <span>약 {guide.estimatedReadMinutes}분</span>
                  <span>·</span>
                  <span>순서 {guide.sortOrder}</span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => openEdit(guide)}
                  className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  title="수정"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(guide.id, guide.title)}
                  disabled={processing}
                  className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
