/**
 * @file AdminSpots.tsx
 * @description 관리자 스팟 관리 탭 — 스팟 목록 조회, 생성, 수정, 삭제
 *
 * API 호출:
 * - GET    /api/v1/spots                — 스팟 목록 조회 (공개 API)
 * - POST   /api/v1/admin/spots          — 스팟 생성
 * - PATCH  /api/v1/admin/spots/:id      — 스팟 수정
 * - DELETE /api/v1/admin/spots/:id      — 스팟 삭제
 */

import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Edit3, AlertTriangle, X, Check } from 'lucide-react';
import { api } from '../../lib/api';

interface AdminSpotsProps {
  /** JWT 액세스 토큰 — API 인증에 사용 */
  token: string;
}

/** 스팟 기본 정보 (목록용 축약 구조) */
interface SpotItem {
  id: string;
  name: string;
  region: string;
  difficulty: string;
  breakType: string | null;
  latitude: string;
  longitude: string;
}

/** 스팟 생성/수정 폼 데이터 */
interface SpotFormData {
  name: string;
  region: string;
  difficulty: string;
  breakType: string;
  latitude: string;
  longitude: string;
  description: string;
}

const EMPTY_FORM: SpotFormData = {
  name: '',
  region: '',
  difficulty: 'BEGINNER',
  breakType: 'beach_break',
  latitude: '',
  longitude: '',
  description: '',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '상급',
  EXPERT: '전문가',
};

const BREAK_LABELS: Record<string, string> = {
  beach_break: '비치 브레이크',
  reef_break: '리프 브레이크',
  point_break: '포인트 브레이크',
};

export function AdminSpots({ token }: AdminSpotsProps) {
  /** 스팟 목록 */
  const [spots, setSpots] = useState<SpotItem[]>([]);
  /** 로딩 상태 */
  const [loading, setLoading] = useState(true);
  /** 폼 표시 여부 (null=숨김, 'create'=생성, spotId=수정) */
  const [formMode, setFormMode] = useState<null | 'create' | string>(null);
  /** 폼 입력 데이터 */
  const [form, setForm] = useState<SpotFormData>(EMPTY_FORM);
  /** 처리 중 상태 */
  const [processing, setProcessing] = useState(false);

  /** 스팟 목록 조회 (GET /api/v1/spots — @Public API 사용) */
  const fetchSpots = async () => {
    try {
      /** limit=200으로 124개 모두 조회 (기본 페이지네이션 회피) */
      const res = await fetch(api('/api/v1/spots?limit=200'));
      if (!res.ok) return;
      const data = await res.json();
      /**
       * 응답 구조 처리:
       * - { data: [...] }  ← 페이지네이션 형식 (실제 응답)
       * - { spots: [...] } ← 레거시 호환
       * - [...]            ← 직접 배열
       */
      setSpots(
        Array.isArray(data)
          ? data
          : data.data ?? data.spots ?? [],
      );
    } catch {
      console.error('스팟 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  /** 생성 폼 열기 */
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormMode('create');
  };

  /** 수정 폼 열기 — 기존 데이터로 폼 초기화 */
  const openEdit = (spot: SpotItem) => {
    setForm({
      name: spot.name,
      region: spot.region,
      difficulty: spot.difficulty,
      breakType: spot.breakType ?? 'beach_break',
      latitude: spot.latitude,
      longitude: spot.longitude,
      description: '',
    });
    setFormMode(spot.id);
  };

  /** 폼 닫기 */
  const closeForm = () => setFormMode(null);

  /** 스팟 저장 (생성 또는 수정) */
  const handleSave = async () => {
    if (!form.name.trim() || !form.region.trim() || !form.latitude || !form.longitude) {
      alert('스팟 이름, 지역, 위도, 경도는 필수입니다.');
      return;
    }

    setProcessing(true);
    try {
      const isCreate = formMode === 'create';
      const url = isCreate
        ? api('/api/v1/admin/spots')
        : api(`/api/v1/admin/spots/${formMode}`);

      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          region: form.region.trim(),
          difficulty: form.difficulty,
          breakType: form.breakType || null,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          description: form.description.trim() || null,
        }),
      });

      if (res.ok) {
        closeForm();
        await fetchSpots(); /** 목록 새로고침 */
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

  /** 스팟 삭제 */
  const handleDelete = async (spotId: string, spotName: string) => {
    if (!confirm(`"${spotName}" 스팟을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    setProcessing(true);
    try {
      const res = await fetch(api(`/api/v1/admin/spots/${spotId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        setSpots(prev => prev.filter(s => s.id !== spotId));
      } else {
        alert('삭제 실패');
      }
    } catch {
      alert('서버 연결 실패');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">스팟 관리</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
                     rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          스팟 추가
        </button>
      </div>

      {/* 스팟 생성/수정 폼 */}
      {formMode !== null && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">
              {formMode === 'create' ? '새 스팟 추가' : '스팟 수정'}
            </h3>
            <button onClick={closeForm} className="p-1 rounded hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 스팟 이름 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">스팟 이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="예: 양양 서피비치"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* 지역 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">지역 *</label>
            <input
              type="text"
              value={form.region}
              onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
              placeholder="예: 양양"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* 위도/경도 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">위도 *</label>
              <input
                type="number"
                value={form.latitude}
                onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                placeholder="38.123456"
                step="0.000001"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">경도 *</label>
              <input
                type="number"
                value={form.longitude}
                onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                placeholder="128.123456"
                step="0.000001"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* 난이도 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">난이도</label>
            <select
              value={form.difficulty}
              onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* 파도 유형 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">파도 유형</label>
            <select
              value={form.breakType}
              onChange={e => setForm(f => ({ ...f, breakType: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.entries(BREAK_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* 설명 */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">설명 (선택)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="스팟 설명..."
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

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

      {/* 스팟 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : spots.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          스팟이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">총 {spots.length}개 스팟</p>
          {spots.map(spot => (
            <div key={spot.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              {/* 스팟 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{spot.name}</span>
                </div>
                <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>{spot.region}</span>
                  <span>·</span>
                  <span>{DIFFICULTY_LABELS[spot.difficulty] ?? spot.difficulty}</span>
                  {spot.breakType && (
                    <>
                      <span>·</span>
                      <span>{BREAK_LABELS[spot.breakType] ?? spot.breakType}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => openEdit(spot)}
                  className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  title="수정"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(spot.id, spot.name)}
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
