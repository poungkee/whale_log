/**
 * @file DiaryFormModal.tsx
 * @description 서핑 다이어리 작성/수정 모달 - 풍성한 UI
 *
 * 입력 항목:
 * 1. 서핑 날짜 (date picker) - 기본값: 오늘
 * 2. 스팟 선택 (검색 드롭다운) - GET /api/v1/spots에서 목록
 * 3. 보드 타입 (이모지 카드 선택) - LONGBOARD / MIDLENGTH / SHORTBOARD
 * 4. 서핑 시간 (프리셋 + 직접 입력)
 * 5. 만족도 (이모지 선택) - 1~5
 * 6. 메모 (textarea) - 선택사항
 *
 * API:
 * - 신규 작성: POST /api/v1/diary
 * - 수정: PATCH /api/v1/diary/:id
 */

import { useState, useEffect } from 'react';
import { X, Loader2, MapPin, Search, Calendar, Clock, Eye, EyeOff, Sunrise } from 'lucide-react';
import type { BoardType } from '../types';

/** 스팟 선택 목록용 간략 타입 */
interface SpotOption {
  id: string;
  name: string;
  region: string;
}

/** 다이어리 항목 전체 타입 (API 응답 기반) */
export interface DiaryFullEntry {
  id: string;
  surfDate: string;
  /** 서핑 시작 시간 (HH:mm, 예: "10:00") - null이면 미입력 */
  surfTime: string | null;
  boardType: BoardType;
  durationMinutes: number;
  satisfaction: number;
  memo: string | null;
  /** 공개 설정 - PRIVATE(나만 보기) / PUBLIC(전체 공개) */
  visibility: 'PRIVATE' | 'PUBLIC';
  /** 자동 매칭된 파고 (m) - surfTime 기반 forecast 조회 결과 */
  waveHeight: string | null;
  /** 자동 매칭된 파도 주기 (초) */
  wavePeriod: string | null;
  /** 자동 매칭된 풍속 (km/h) */
  windSpeed: string | null;
  spot: SpotOption | null;
  images: { id: string; imageUrl: string; sortOrder: number }[];
}

interface DiaryFormModalProps {
  /** 수정 모드일 때 기존 다이어리 데이터 (null이면 신규 작성) */
  editEntry: DiaryFullEntry | null;
  /** 사용자 기본 보드 타입 (신규 작성 시 기본값) */
  defaultBoardType?: BoardType;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 저장 완료 핸들러 - 목록 새로고침용 */
  onSaved: () => void;
}

/** 보드 타입별 설정 (이모지 + 라벨 + 색상 + 설명) */
const BOARD_CONFIG: { type: BoardType; emoji: string; label: string; color: string; desc: string }[] = [
  { type: 'LONGBOARD', emoji: '🏄', label: '롱보드', color: '#32CD32', desc: '안정적 라이딩' },
  { type: 'MIDLENGTH', emoji: '🏄‍♂️', label: '미드렝스', color: '#008CBA', desc: '올라운드' },
  { type: 'SHORTBOARD', emoji: '🏄‍♀️', label: '숏보드', color: '#FF8C00', desc: '기동성 최고' },
];

/** 만족도별 설정 (이모지 + 라벨 + 색상) */
const SATISFACTION_OPTIONS = [
  { value: 1, emoji: '😞', label: '별로', color: '#ef4444' },
  { value: 2, emoji: '😕', label: '아쉬움', color: '#f97316' },
  { value: 3, emoji: '😊', label: '보통', color: '#eab308' },
  { value: 4, emoji: '😄', label: '좋음', color: '#22c55e' },
  { value: 5, emoji: '🤩', label: '최고!', color: '#3b82f6' },
];

/** 시간 프리셋 (분 단위) - 이모지 + 라벨 */
const DURATION_PRESETS = [
  { minutes: 30, label: '30분', emoji: '⚡' },
  { minutes: 60, label: '1시간', emoji: '🌊' },
  { minutes: 90, label: '1.5시간', emoji: '🔥' },
  { minutes: 120, label: '2시간', emoji: '💪' },
];

/**
 * 서핑 시작 시간 프리셋
 * - 서퍼들이 주로 서핑하는 시간대: 새벽/아침/오전/점심/오후
 * - 이 시간으로 forecast DB에서 정확한 파도 데이터를 자동 매칭
 */
const SURF_TIME_PRESETS = [
  { time: '06:00', label: '새벽 6시', emoji: '🌅' },
  { time: '08:00', label: '아침 8시', emoji: '🌤️' },
  { time: '10:00', label: '오전 10시', emoji: '☀️' },
  { time: '12:00', label: '점심 12시', emoji: '🌞' },
  { time: '14:00', label: '오후 2시', emoji: '⛅' },
  { time: '16:00', label: '오후 4시', emoji: '🌇' },
];

export function DiaryFormModal({ editEntry, defaultBoardType, onClose, onSaved }: DiaryFormModalProps) {
  /** 오늘 날짜 (YYYY-MM-DD) */
  const today = new Date().toISOString().slice(0, 10);

  /* ===== 폼 상태 ===== */
  /** 서핑 날짜 */
  const [surfDate, setSurfDate] = useState(editEntry?.surfDate || today);
  /**
   * 서핑 시작 시간 (HH:mm 형식)
   * - forecast 자동 매칭에 사용: surfDate + surfTime → 해당 시점 파도 데이터 조회
   * - 빈 문자열이면 미입력 (forecast 매칭 안 함)
   */
  const [surfTime, setSurfTime] = useState(editEntry?.surfTime || '');
  /** 선택한 스팟 ID */
  const [spotId, setSpotId] = useState(editEntry?.spot?.id || '');
  /** 보드 타입 */
  const [boardType, setBoardType] = useState<BoardType>(
    editEntry?.boardType || (defaultBoardType && defaultBoardType !== 'UNSET' ? defaultBoardType : 'LONGBOARD')
  );
  /** 서핑 시간 (분) */
  const [durationMinutes, setDurationMinutes] = useState(editEntry?.durationMinutes || 60);
  /** 만족도 (1~5) */
  const [satisfaction, setSatisfaction] = useState(editEntry?.satisfaction || 3);
  /** 메모 */
  const [memo, setMemo] = useState(editEntry?.memo || '');
  /** 공개/비공개 설정 (PRIVATE=나만 보기, PUBLIC=전체 공개) */
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>(
    editEntry?.visibility || 'PRIVATE'
  );

  /* ===== UI 상태 ===== */
  /** 스팟 목록 (API에서 가져옴) */
  const [spots, setSpots] = useState<SpotOption[]>([]);
  /** 스팟 검색어 (드롭다운 필터용) */
  const [spotSearch, setSpotSearch] = useState('');
  /** 스팟 드롭다운 열림 상태 */
  const [spotDropdownOpen, setSpotDropdownOpen] = useState(false);
  /** 저장 중 로딩 상태 */
  const [saving, setSaving] = useState(false);
  /** 에러 메시지 */
  const [error, setError] = useState<string | null>(null);

  /**
   * 스팟 목록 가져오기
   * GET /api/v1/spots → 전체 스팟 목록 (이름, 지역)
   */
  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const res = await fetch('/api/v1/spots');
        if (!res.ok) return;
        const data = await res.json();
        /** 배열 형태로 오든 data 프로퍼티로 오든 처리 */
        const list: SpotOption[] = (Array.isArray(data) ? data : data.data || []).map(
          (s: { id: string; name: string; region: string }) => ({
            id: s.id,
            name: s.name,
            region: s.region,
          })
        );
        setSpots(list);
      } catch {
        console.warn('스팟 목록 조회 실패');
      }
    };
    fetchSpots();
  }, []);

  /** 스팟 검색 필터링 - 이름 또는 지역으로 검색 */
  const filteredSpots = spots.filter(s => {
    if (!spotSearch) return true;
    const q = spotSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q);
  });

  /** 현재 선택된 스팟 정보 */
  const selectedSpot = spots.find(s => s.id === spotId);

  /**
   * 폼 제출 - 다이어리 생성 또는 수정
   * POST /api/v1/diary (신규) 또는 PATCH /api/v1/diary/:id (수정)
   */
  const handleSubmit = async () => {
    /** 필수값 검증 */
    if (!spotId) {
      setError('스팟을 선택해주세요');
      return;
    }
    if (durationMinutes < 1) {
      setError('서핑 시간을 입력해주세요');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('로그인이 필요합니다');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const isEdit = !!editEntry;
      const url = isEdit ? `/api/v1/diary/${editEntry.id}` : '/api/v1/diary';
      const method = isEdit ? 'PATCH' : 'POST';

      /**
       * 요청 body 구성
       * - 수정 시 spotId/surfDate/surfTime은 변경 불가 (백엔드 DTO 제한)
       * - visibility는 수정 가능 (나중에 공개↔비공개 전환 허용)
       */
      const body: Record<string, unknown> = {
        boardType,
        durationMinutes,
        satisfaction,
        memo: memo.trim() || undefined,
        visibility,
      };

      /** 신규 작성 시에만 spotId, surfDate, surfTime 포함 */
      if (!isEdit) {
        body.spotId = spotId;
        body.surfDate = surfDate;
        /** surfTime이 있으면 전송 → 백엔드에서 forecast 자동 매칭 */
        if (surfTime) {
          body.surfTime = surfTime;
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || '저장에 실패했습니다');
      }

      /** 저장 성공 → 부모 컴포넌트에 알림 후 모달 닫기 */
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* 반투명 배경 오버레이 - 클릭 시 닫기 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 본체 - 하단에서 슬라이드업 */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up">
        {/* 드래그 핸들 바 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* 헤더 - 그라데이션 배경 + 제목 + 닫기 버튼 */}
        <div className="sticky top-0 bg-card z-10 px-5 pb-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{editEntry ? '✏️' : '🏄'}</span>
              <h2 className="text-lg font-bold">
                {editEntry ? '기록 수정' : '서핑 기록하기'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-5">
          {/* ===== 1. 서핑 날짜 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              서핑 날짜
            </label>
            <input
              type="date"
              value={surfDate}
              max={today}
              onChange={(e) => setSurfDate(e.target.value)}
              disabled={!!editEntry}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            {editEntry && (
              <p className="text-[11px] text-muted-foreground mt-1 ml-1">수정 시 날짜는 변경할 수 없어요</p>
            )}
          </div>

          {/* ===== 1.5. 서핑 시작 시간 - forecast 자동 매칭용 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <Sunrise className="w-3.5 h-3.5 text-primary" />
              서핑 시작 시간
              <span className="text-xs text-muted-foreground font-normal">(선택 - 파도 데이터 자동 연결)</span>
            </label>
            {/* 시간 프리셋 버튼 - 서퍼들이 자주 타는 시간대 */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {SURF_TIME_PRESETS.map(t => (
                <button
                  key={t.time}
                  type="button"
                  onClick={() => setSurfTime(surfTime === t.time ? '' : t.time)}
                  disabled={!!editEntry}
                  className={`py-2 rounded-xl text-center border transition-all
                    ${surfTime === t.time
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/30'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="text-base block">{t.emoji}</span>
                  <span className={`text-[10px] font-medium ${surfTime === t.time ? 'text-primary' : ''}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
            {/* 직접 시간 입력 (HH:mm) */}
            <input
              type="time"
              value={surfTime}
              onChange={(e) => setSurfTime(e.target.value)}
              disabled={!!editEntry}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm text-center font-medium
                         focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {editEntry && surfTime && (
              <p className="text-[11px] text-muted-foreground mt-1 ml-1">수정 시 시작 시간은 변경할 수 없어요</p>
            )}
            {!editEntry && (
              <p className="text-[11px] text-muted-foreground mt-1 ml-1">
                입력하면 그 시간의 실제 파도·바람 데이터가 자동으로 기록돼요
              </p>
            )}
          </div>

          {/* ===== 2. 스팟 선택 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              서핑 스팟
            </label>
            {editEntry ? (
              /* 수정 모드에서는 스팟 변경 불가 - 텍스트로만 표시 */
              <div className="px-4 py-3 bg-secondary border border-border rounded-xl text-sm opacity-50 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {editEntry.spot?.name || '알 수 없는 스팟'}
                <span className="text-muted-foreground">({editEntry.spot?.region || ''})</span>
              </div>
            ) : (
              /* 신규 작성 - 검색 가능한 드롭다운 */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSpotDropdownOpen(!spotDropdownOpen)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm text-left transition-all flex items-center gap-2
                    ${spotDropdownOpen
                      ? 'bg-card border-primary/50 ring-2 ring-primary/20'
                      : 'bg-secondary border-border hover:border-primary/30'
                    }
                    ${!selectedSpot ? 'text-muted-foreground' : ''}`}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  {selectedSpot
                    ? <span className="text-foreground">{selectedSpot.name} <span className="text-muted-foreground">({selectedSpot.region})</span></span>
                    : '어디서 서핑했나요?'}
                </button>

                {/* 드롭다운 목록 */}
                {spotDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl z-20 max-h-52 overflow-y-auto">
                    {/* 검색 입력 */}
                    <div className="sticky top-0 bg-card p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          value={spotSearch}
                          onChange={(e) => setSpotSearch(e.target.value)}
                          placeholder="스팟 이름 또는 지역 검색..."
                          className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm
                                     focus:outline-none focus:ring-1 focus:ring-primary/50"
                          autoFocus
                        />
                      </div>
                    </div>
                    {/* 스팟 옵션 목록 */}
                    {filteredSpots.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSpotId(s.id);
                          setSpotDropdownOpen(false);
                          setSpotSearch('');
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm hover:bg-secondary/80 transition-colors
                                    flex items-center gap-2
                          ${spotId === s.id ? 'bg-primary/10' : ''}`}
                      >
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${spotId === s.id ? 'text-primary' : 'text-muted-foreground/50'}`} />
                        <span className={spotId === s.id ? 'text-primary font-semibold' : ''}>
                          {s.name}
                        </span>
                        <span className="text-muted-foreground text-xs ml-auto">{s.region}</span>
                      </button>
                    ))}
                    {filteredSpots.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        검색 결과가 없어요
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== 3. 보드 타입 - 이모지 카드 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              🏄 보드 타입
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BOARD_CONFIG.map(b => (
                <button
                  key={b.type}
                  onClick={() => setBoardType(b.type)}
                  className={`py-3 px-2 rounded-xl text-center border-2 transition-all
                    ${boardType === b.type
                      ? 'scale-[1.02] shadow-md'
                      : 'border-border hover:border-primary/30 opacity-60 hover:opacity-100'
                    }`}
                  style={boardType === b.type ? {
                    borderColor: b.color,
                    backgroundColor: `${b.color}10`,
                  } : {}}
                >
                  <span className="text-2xl block mb-1">{b.emoji}</span>
                  <span className="text-xs font-bold block" style={boardType === b.type ? { color: b.color } : {}}>
                    {b.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5">{b.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== 4. 서핑 시간 (분) ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <Clock className="w-3.5 h-3.5 text-primary" />
              서핑 시간
            </label>
            {/* 프리셋 버튼 - 이모지 포함 */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {DURATION_PRESETS.map(d => (
                <button
                  key={d.minutes}
                  onClick={() => setDurationMinutes(d.minutes)}
                  className={`py-2 rounded-xl text-center border transition-all
                    ${durationMinutes === d.minutes
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/30'
                    }`}
                >
                  <span className="text-base block">{d.emoji}</span>
                  <span className={`text-[11px] font-medium ${durationMinutes === d.minutes ? 'text-primary' : ''}`}>
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
            {/* 직접 입력 */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                min={1}
                max={600}
                className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm text-center font-medium
                           focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <span className="text-sm text-muted-foreground font-medium">분</span>
            </div>
          </div>

          {/* ===== 5. 만족도 (이모지 선택) ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              ⭐ 만족도
            </label>
            <div className="flex gap-1.5 justify-between">
              {SATISFACTION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSatisfaction(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-center border-2 transition-all
                    ${satisfaction === opt.value
                      ? 'scale-105 shadow-md'
                      : 'border-border opacity-50 hover:opacity-80'
                    }`}
                  style={satisfaction === opt.value ? {
                    borderColor: opt.color,
                    backgroundColor: `${opt.color}15`,
                  } : {}}
                >
                  <span className={`text-2xl block ${satisfaction === opt.value ? '' : 'grayscale'}`}>
                    {opt.emoji}
                  </span>
                  <span
                    className="text-[10px] font-bold block mt-0.5"
                    style={satisfaction === opt.value ? { color: opt.color } : {}}
                  >
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== 6. 메모 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              📝 메모
              <span className="text-xs text-muted-foreground font-normal">(선택)</span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="오늘 서핑은 어땠나요?&#10;파도 컨디션, 기분, 배운 점 등을 자유롭게 적어보세요..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                         placeholder:text-muted-foreground/40 transition-all leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground text-right mt-0.5 mr-1">
              {memo.length}/500
            </p>
          </div>

          {/* ===== 7. 공개/비공개 토글 ===== */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              {visibility === 'PUBLIC' ? (
                <Eye className="w-3.5 h-3.5 text-primary" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              공개 설정
            </label>
            {/* 공개/비공개 토글 버튼 - 인향이 요청: 일기별로 선택 가능 */}
            <div className="flex gap-2">
              {/* 나만 보기 (PRIVATE) */}
              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`flex-1 py-3 rounded-xl text-center border-2 transition-all flex items-center justify-center gap-2
                  ${visibility === 'PRIVATE'
                    ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                    : 'border-border opacity-60 hover:opacity-80'
                  }`}
              >
                <EyeOff className={`w-4 h-4 ${visibility === 'PRIVATE' ? 'text-blue-500' : ''}`} />
                <div>
                  <span className={`text-sm font-bold block ${visibility === 'PRIVATE' ? 'text-blue-500' : ''}`}>
                    나만 보기
                  </span>
                  <span className="text-[9px] text-muted-foreground">비공개</span>
                </div>
              </button>
              {/* 전체 공개 (PUBLIC) */}
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`flex-1 py-3 rounded-xl text-center border-2 transition-all flex items-center justify-center gap-2
                  ${visibility === 'PUBLIC'
                    ? 'border-green-500 bg-green-500/10 shadow-sm'
                    : 'border-border opacity-60 hover:opacity-80'
                  }`}
              >
                <Eye className={`w-4 h-4 ${visibility === 'PUBLIC' ? 'text-green-500' : ''}`} />
                <div>
                  <span className={`text-sm font-bold block ${visibility === 'PUBLIC' ? 'text-green-500' : ''}`}>
                    전체 공개
                  </span>
                  <span className="text-[9px] text-muted-foreground">다른 서퍼에게 공유</span>
                </div>
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* 저장 버튼 - 그라데이션 */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-blue-600 text-white
                       rounded-2xl font-bold text-base shadow-lg shadow-primary/25
                       hover:shadow-primary/40 hover:scale-[1.01]
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                       flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-5 h-5 animate-spin" />}
            {saving ? '저장 중...' : (editEntry ? '✏️ 수정하기' : '🏄 기록하기')}
          </button>

          {/* 하단 여백 (safe area 대응) */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
