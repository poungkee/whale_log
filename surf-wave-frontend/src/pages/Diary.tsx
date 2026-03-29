/**
 * @file Diary.tsx
 * @description 서핑 다이어리 페이지 - 서핑 기록 목록 + 캘린더 + 작성/수정/삭제
 *
 * 2가지 뷰 모드:
 * 1. 리스트 뷰: 최근 기록 카드 목록 (페이지네이션) - 만족도 색상 + 이모지 + 날짜 포맷
 * 2. 캘린더 뷰: 월간 캘린더에 서핑 활동 히트맵 표시
 *
 * API 연동:
 * - GET /api/v1/diary?page=N&limit=10 → 목록 조회
 * - GET /api/v1/diary/calendar?year=Y&month=M → 캘린더 데이터
 * - DELETE /api/v1/diary/:id → 삭제
 *
 * 진입점: MyPage "나의 서핑 기록" → "전체 보기" 버튼
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Plus, List, CalendarDays, Trash2, Edit3,
  Star, Clock, MapPin, ChevronLeft, ChevronRight, Loader2,
  Waves, Wind, Eye, EyeOff, Sunrise,
} from 'lucide-react';
import type { BoardType } from '../types';
import { DiaryFormModal } from '../components/DiaryFormModal';
import type { DiaryFullEntry } from '../components/DiaryFormModal';

interface DiaryProps {
  /** 사용자 기본 보드 타입 (신규 작성 시 기본값) */
  defaultBoardType?: BoardType;
  /** 뒤로가기 핸들러 - MyPage로 복귀 */
  onBack: () => void;
}

/** 페이지네이션 메타 데이터 */
interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** 캘린더 날짜별 서핑 활동 */
interface CalendarDay {
  date: string;
  count: number;
  spotNames: string[];
}

/** 보드 타입별 한국어 라벨 + 이모지 — 백엔드 BoardType 8종류 + MIDLENGTH(레거시) */
const BOARD_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  LONGBOARD: { label: '롱보드', emoji: '🏄', color: '#32CD32' },
  FUNBOARD: { label: '펀보드', emoji: '🛹', color: '#008CBA' },
  MIDLENGTH: { label: '미드렝스', emoji: '🏄‍♂️', color: '#6366F1' },
  FISH: { label: '피쉬', emoji: '🐟', color: '#EC4899' },
  SHORTBOARD: { label: '숏보드', emoji: '🏄‍♀️', color: '#FF8C00' },
  SUP: { label: 'SUP', emoji: '🚣', color: '#14B8A6' },
  BODYBOARD: { label: '바디보드', emoji: '🤸', color: '#8B5CF6' },
  FOIL: { label: '포일', emoji: '🪁', color: '#0EA5E9' },
  OTHER: { label: '기타', emoji: '🏖️', color: '#6B7280' },
};

/** 만족도별 이모지 + 색상 + 라벨 */
const SATISFACTION_CONFIG: Record<number, { emoji: string; color: string; label: string; bg: string }> = {
  1: { emoji: '😞', color: '#ef4444', label: '별로', bg: 'rgba(239,68,68,0.1)' },
  2: { emoji: '😕', color: '#f97316', label: '아쉬움', bg: 'rgba(249,115,22,0.1)' },
  3: { emoji: '😊', color: '#eab308', label: '보통', bg: 'rgba(234,179,8,0.1)' },
  4: { emoji: '😄', color: '#22c55e', label: '좋음', bg: 'rgba(34,197,94,0.1)' },
  5: { emoji: '🤩', color: '#3b82f6', label: '최고', bg: 'rgba(59,130,246,0.1)' },
};

/** 요일 한국어 라벨 */
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
/** 요일 풀네임 (날짜 포맷용) */
const WEEKDAY_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/**
 * 날짜 문자열(YYYY-MM-DD)을 한국어 친화적 포맷으로 변환
 * 예: "2026-03-14" → "3월 14일 토요일"
 */
const formatDateKo = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAY_FULL[d.getDay()];
  return `${month}월 ${day}일 ${weekday}`;
};

/**
 * 날짜가 오늘/어제/그저께인지 판단하여 상대 날짜 텍스트 반환
 */
const getRelativeDate = (dateStr: string): string | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff === 2) return '그저께';
  return null;
};

export function Diary({ defaultBoardType, onBack }: DiaryProps) {
  /* ===== 뷰 모드 상태 ===== */
  /** 현재 뷰: 'list' (목록) 또는 'calendar' (캘린더) */
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  /* ===== 리스트 뷰 상태 ===== */
  /** 다이어리 항목 목록 */
  const [entries, setEntries] = useState<DiaryFullEntry[]>([]);
  /** 페이지네이션 메타 */
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  /** 현재 페이지 번호 */
  const [page, setPage] = useState(1);
  /** 목록 로딩 상태 */
  const [listLoading, setListLoading] = useState(true);

  /* ===== 캘린더 뷰 상태 ===== */
  /** 캘린더 표시 년도 */
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  /** 캘린더 표시 월 (1~12) */
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  /** 캘린더 데이터 (날짜별 활동) */
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  /** 캘린더 로딩 상태 */
  const [calLoading, setCalLoading] = useState(false);

  /* ===== 모달 상태 ===== */
  /** 작성/수정 폼 모달 표시 여부 */
  const [showForm, setShowForm] = useState(false);
  /** 수정 대상 다이어리 (null이면 신규 작성) */
  const [editTarget, setEditTarget] = useState<DiaryFullEntry | null>(null);
  /** 삭제 확인 대상 ID */
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  /** 삭제 진행 중 */
  const [deleting, setDeleting] = useState(false);

  /**
   * 다이어리 목록 조회
   * GET /api/v1/diary?page={page}&limit=10
   */
  const fetchList = useCallback(async (pageNum: number) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setListLoading(false);
      return;
    }

    setListLoading(true);
    try {
      const res = await fetch(`/api/v1/diary?page=${pageNum}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('목록 조회 실패');

      const json = await res.json();
      setEntries(json.data || []);
      setMeta(json.meta || null);
    } catch {
      console.warn('다이어리 목록 조회 실패');
    } finally {
      setListLoading(false);
    }
  }, []);

  /**
   * 캘린더 데이터 조회
   * GET /api/v1/diary/calendar?year={year}&month={month}
   */
  const fetchCalendar = useCallback(async (year: number, month: number) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setCalLoading(true);
    try {
      const res = await fetch(`/api/v1/diary/calendar?year=${year}&month=${month}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('캘린더 조회 실패');

      const data = await res.json();
      setCalendarData(Array.isArray(data) ? data : []);
    } catch {
      console.warn('캘린더 데이터 조회 실패');
      setCalendarData([]);
    } finally {
      setCalLoading(false);
    }
  }, []);

  /** 리스트 뷰: 페이지 변경 시 데이터 조회 */
  useEffect(() => {
    if (viewMode === 'list') {
      fetchList(page);
    }
  }, [page, viewMode, fetchList]);

  /** 캘린더 뷰: 년/월 변경 시 데이터 조회 */
  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendar(calYear, calMonth);
    }
  }, [calYear, calMonth, viewMode, fetchCalendar]);

  /**
   * 다이어리 삭제
   * DELETE /api/v1/diary/:id
   */
  const handleDelete = async () => {
    if (!deleteTargetId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/diary/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('삭제 실패');

      /** 삭제 성공 → 목록에서 즉시 제거 (낙관적 업데이트) */
      setEntries(prev => prev.filter(e => e.id !== deleteTargetId));
      setDeleteTargetId(null);

      /** 캘린더도 새로고침 */
      if (viewMode === 'calendar') {
        fetchCalendar(calYear, calMonth);
      }
    } catch {
      alert('삭제에 실패했습니다');
    } finally {
      setDeleting(false);
    }
  };

  /** 폼 저장 완료 후 목록 새로고침 */
  const handleFormSaved = () => {
    fetchList(page);
    if (viewMode === 'calendar') {
      fetchCalendar(calYear, calMonth);
    }
  };

  /** 수정 모달 열기 */
  const openEdit = (entry: DiaryFullEntry) => {
    setEditTarget(entry);
    setShowForm(true);
  };

  /** 신규 작성 모달 열기 */
  const openCreate = () => {
    setEditTarget(null);
    setShowForm(true);
  };

  /**
   * 캘린더 월 이동
   * @param delta -1: 이전 달, +1: 다음 달
   */
  const moveMonth = (delta: number) => {
    let newMonth = calMonth + delta;
    let newYear = calYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setCalMonth(newMonth);
    setCalYear(newYear);
  };

  /**
   * 캘린더 그리드 생성
   * 해당 월의 1일 ~ 마지막일을 7열 그리드로 배치
   * 활동 횟수에 따라 셀 배경 색상 강도가 달라짐 (히트맵 스타일)
   */
  const buildCalendarGrid = () => {
    /** 해당 월의 1일이 무슨 요일인지 (0=일, 6=토) */
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    /** 해당 월의 총 일수 */
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    /** 오늘 날짜 문자열 (비교용) */
    const todayStr = new Date().toISOString().slice(0, 10);

    /** 날짜별 캘린더 데이터 맵 (빠른 조회용) */
    const dataMap = new Map(calendarData.map(d => [d.date, d]));

    const cells: JSX.Element[] = [];

    /** 첫 주 빈 칸 (1일 이전) */
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-12" />);
    }

    /** 1일 ~ 마지막일 */
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = dataMap.get(dateStr);
      const isToday = dateStr === todayStr;
      /** 활동 횟수에 따른 배경 강도 (1회=20%, 2회=35%, 3회+=50%) */
      const intensity = dayData ? Math.min(dayData.count * 15 + 5, 50) : 0;

      cells.push(
        <div
          key={dateStr}
          className={`h-12 flex flex-col items-center justify-center rounded-xl text-xs relative transition-all
            ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
            ${dayData ? 'cursor-default' : ''}`}
          style={dayData ? { backgroundColor: `rgba(59,130,246,${intensity / 100})` } : {}}
          title={dayData ? `${dayData.count}회 - ${dayData.spotNames.join(', ')}` : ''}
        >
          <span className={`font-medium ${isToday ? 'text-primary font-bold' : ''} ${dayData ? 'text-white' : ''}`}>
            {day}
          </span>
          {/* 서핑 활동이 있는 날 - 서핑 이모지 표시 */}
          {dayData && (
            <span className="text-[8px] mt-0.5 leading-none">
              {dayData.count >= 3 ? '🔥' : dayData.count >= 2 ? '🏄' : '🌊'}
            </span>
          )}
        </div>
      );
    }

    return cells;
  };

  /** 만족도 별 렌더링 (1~5) */
  const renderStars = (count: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= count ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/20'}`}
        />
      ))}
    </div>
  );

  /** 서핑 시간 한국어 포맷 */
  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
    }
    return `${minutes}분`;
  };

  return (
    <div className="min-h-screen pb-20">
      {/* ===== 그라데이션 헤더 ===== */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#0D1B2A] via-[#1A2332] to-[#0D1B2A] border-b border-primary/20">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          {/* 뒤로가기 버튼 */}
          <button onClick={onBack} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* 타이틀 + 서핑 이모지 */}
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              서핑 다이어리
            </h1>
          </div>
          {/* 뷰 전환 토글 (리스트 ↔ 캘린더) */}
          <div className="flex gap-0.5 bg-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary/80 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-primary/80 text-white shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* 총 기록 수 배지 (리스트 뷰에서만 표시) */}
        {viewMode === 'list' && meta && meta.totalItems > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">
              총 <span className="font-bold text-primary">{meta.totalItems}</span>개의 서핑 기록
            </span>
          </div>
        )}

        {/* ===== 리스트 뷰 ===== */}
        {viewMode === 'list' && (
          <>
            {/* 로딩 스켈레톤 */}
            {listLoading && entries.length === 0 && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-secondary rounded-xl" />
                      <div className="flex-1">
                        <div className="h-4 bg-secondary rounded w-28 mb-2" />
                        <div className="h-3 bg-secondary rounded w-20" />
                      </div>
                      <div className="h-6 bg-secondary rounded-full w-16" />
                    </div>
                    <div className="h-3 bg-secondary rounded w-32 mb-2" />
                    <div className="h-3 bg-secondary rounded w-20" />
                  </div>
                ))}
              </div>
            )}

            {/* 다이어리 카드 목록 */}
            {!listLoading && entries.length > 0 && (
              <div className="space-y-3">
                {entries.map(entry => {
                  const sat = SATISFACTION_CONFIG[entry.satisfaction] || SATISFACTION_CONFIG[3];
                  const board = BOARD_CONFIG[entry.boardType] || BOARD_CONFIG['LONGBOARD'];
                  const relDate = getRelativeDate(entry.surfDate);

                  return (
                    <div
                      key={entry.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden
                                 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all cursor-pointer"
                      onClick={() => openEdit(entry)}
                    >
                      {/* 만족도 색상 상단 바 */}
                      <div className="h-1" style={{ backgroundColor: sat.color }} />

                      <div className="p-4">
                        {/* 상단: 만족도 이모지 + 날짜 + 보드 배지 */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {/* 만족도 이모지 (큰 원형 배경) */}
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                              style={{ backgroundColor: sat.bg }}
                            >
                              {sat.emoji}
                            </div>
                            <div>
                              {/* 날짜 - 한국어 포맷 + 시작 시간 + 상대 날짜 태그 */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-bold">{formatDateKo(entry.surfDate)}</span>
                                {/* 서핑 시작 시간 태그 (입력한 경우만 표시) */}
                                {entry.surfTime && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded font-medium flex items-center gap-0.5">
                                    <Sunrise className="w-2.5 h-2.5" />
                                    {entry.surfTime}
                                  </span>
                                )}
                                {relDate && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                                    {relDate}
                                  </span>
                                )}
                              </div>
                              {/* 스팟 이름 + 지역 */}
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {entry.spot?.name || '알 수 없는 스팟'}
                                  {entry.spot?.region && ` · ${entry.spot.region}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 보드 타입 + 공개/비공개 배지 */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* 공개/비공개 아이콘 - 한눈에 공개 상태 확인 */}
                            {entry.visibility === 'PUBLIC' ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 flex items-center gap-0.5" title="전체 공개">
                                <Eye className="w-2.5 h-2.5" />
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400 flex items-center gap-0.5" title="나만 보기">
                                <EyeOff className="w-2.5 h-2.5" />
                              </span>
                            )}
                            {/* 보드 타입 배지 */}
                            <span
                              className="text-[10px] px-2 py-1 rounded-full font-semibold flex items-center gap-1"
                              style={{
                                backgroundColor: `${board.color}18`,
                                color: board.color,
                              }}
                            >
                              {board.emoji} {board.label}
                            </span>
                          </div>
                        </div>

                        {/* 중앙: 서핑 시간 + 만족도 별점 + 파도 정보 */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          {/* 서핑 시간 */}
                          <div className="flex items-center gap-1 text-xs bg-secondary/70 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span className="font-medium">{formatDuration(entry.durationMinutes)}</span>
                          </div>
                          {/* 만족도 별점 */}
                          <div className="flex items-center gap-1">
                            {renderStars(entry.satisfaction)}
                            <span className="text-[10px] font-medium ml-0.5" style={{ color: sat.color }}>
                              {sat.label}
                            </span>
                          </div>
                          {/* 파도 높이 - forecast 자동 매칭 데이터 (surfTime 기반) */}
                          {entry.waveHeight && (
                            <div className="flex items-center gap-1 text-xs bg-cyan-500/10 px-2 py-1 rounded-lg">
                              <Waves className="w-3 h-3 text-cyan-400" />
                              <span className="font-medium text-cyan-300">{Number(entry.waveHeight).toFixed(1)}m</span>
                            </div>
                          )}
                          {/* 파도 주기 - forecast 자동 매칭 데이터 */}
                          {entry.wavePeriod && (
                            <div className="flex items-center gap-1 text-xs bg-blue-500/10 px-2 py-1 rounded-lg">
                              <span className="text-blue-400 text-[10px]">T</span>
                              <span className="font-medium text-blue-300">{Number(entry.wavePeriod).toFixed(1)}s</span>
                            </div>
                          )}
                          {/* 풍속 - forecast 자동 매칭 데이터 */}
                          {entry.windSpeed && (
                            <div className="flex items-center gap-1 text-xs bg-green-500/10 px-2 py-1 rounded-lg">
                              <Wind className="w-3 h-3 text-green-400" />
                              <span className="font-medium text-green-300">{Number(entry.windSpeed).toFixed(0)}km/h</span>
                            </div>
                          )}
                        </div>

                        {/* 메모 (있으면 표시) */}
                        {entry.memo && (
                          <div className="relative mb-2">
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-primary/30" />
                            <p className="text-xs text-muted-foreground line-clamp-2 pl-3 italic">
                              "{entry.memo}"
                            </p>
                          </div>
                        )}

                        {/* 첨부 사진 (있으면 표시) — 가로 스크롤 썸네일 */}
                        {entry.images && entry.images.length > 0 && (
                          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                            {entry.images
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((img) => (
                                <img
                                  key={img.id}
                                  src={img.imageUrl}
                                  alt="서핑 사진"
                                  className="w-20 h-20 rounded-lg object-cover border border-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); window.open(img.imageUrl, '_blank'); }}
                                />
                              ))}
                          </div>
                        )}

                        {/* 하단: 수정/삭제 버튼 */}
                        <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-border/50">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(entry); }}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary
                                       transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/5"
                          >
                            <Edit3 className="w-3 h-3" />
                            수정
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTargetId(entry.id); }}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive
                                       transition-colors px-2.5 py-1.5 rounded-lg hover:bg-destructive/5"
                          >
                            <Trash2 className="w-3 h-3" />
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 페이지네이션 */}
                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 py-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={!meta.hasPrevious}
                      className="px-4 py-2 text-sm border border-border rounded-xl font-medium
                                 disabled:opacity-30 hover:bg-secondary hover:border-primary/30 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4 inline mr-1" />
                      이전
                    </button>
                    <span className="text-sm text-muted-foreground">
                      <span className="font-bold text-foreground">{meta.page}</span> / {meta.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={!meta.hasNext}
                      className="px-4 py-2 text-sm border border-border rounded-xl font-medium
                                 disabled:opacity-30 hover:bg-secondary hover:border-primary/30 transition-all"
                    >
                      다음
                      <ChevronRight className="w-4 h-4 inline ml-1" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 빈 상태 - 기록이 없을 때 */}
            {!listLoading && entries.length === 0 && (
              <div className="text-center py-20">
                {/* 애니메이션 파도 아이콘 */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl">🏄</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2">아직 서핑 기록이 없어요</h3>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                  서핑을 다녀온 후 기록을 남겨보세요!<br />
                  파도, 시간, 만족도를 한눈에 돌아볼 수 있어요
                </p>
                <button
                  onClick={openCreate}
                  className="px-8 py-3 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground
                             rounded-2xl font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40
                             hover:scale-[1.02] transition-all"
                >
                  + 첫 기록 남기기
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== 캘린더 뷰 ===== */}
        {viewMode === 'calendar' && (
          <div>
            {/* 월 네비게이션 - 그라데이션 배경 */}
            <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-3">
              <button onClick={() => moveMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                {calYear}년 {calMonth}월
              </h2>
              <button onClick={() => moveMonth(1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAY_LABELS.map(d => (
                <div
                  key={d}
                  className={`text-center text-[11px] font-semibold py-1.5
                    ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-muted-foreground'}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 캘린더 그리드 - 히트맵 스타일 */}
            {calLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 bg-card border border-border rounded-2xl p-3">
                {buildCalendarGrid()}
              </div>
            )}

            {/* 범례 */}
            <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
              <span>활동 없음</span>
              <div className="flex gap-1">
                {[10, 25, 40].map((opacity, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: `rgba(59,130,246,${opacity / 100})` }}
                  />
                ))}
              </div>
              <span>활동 많음</span>
            </div>

            {/* 이번 달 서핑 요약 - 풍성한 카드 */}
            {!calLoading && calendarData.length > 0 && (
              <div className="mt-4 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                  📊 {calMonth}월 서핑 요약
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* 서핑 일수 */}
                  <div className="bg-card/60 rounded-xl p-3 text-center">
                    <CalendarDays className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                    <p className="text-lg font-black">{calendarData.length}</p>
                    <p className="text-[10px] text-muted-foreground">서핑 일수</p>
                  </div>
                  {/* 총 세션 */}
                  <div className="bg-card/60 rounded-xl p-3 text-center">
                    <Waves className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                    <p className="text-lg font-black">
                      {calendarData.reduce((sum, d) => sum + d.count, 0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">총 세션</p>
                  </div>
                  {/* 방문 스팟 */}
                  <div className="bg-card/60 rounded-xl p-3 text-center">
                    <MapPin className="w-4 h-4 mx-auto mb-1 text-orange-400" />
                    <p className="text-lg font-black">
                      {new Set(calendarData.flatMap(d => d.spotNames)).size}
                    </p>
                    <p className="text-[10px] text-muted-foreground">방문 스팟</p>
                  </div>
                </div>

                {/* 스팟 이름 태그 */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[...new Set(calendarData.flatMap(d => d.spotNames))].slice(0, 5).map(name => (
                    <span
                      key={name}
                      className="text-[10px] px-2 py-0.5 bg-card/80 rounded-full text-muted-foreground border border-border/50"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 캘린더 빈 상태 */}
            {!calLoading && calendarData.length === 0 && (
              <div className="text-center py-10">
                <span className="text-4xl block mb-3">🌊</span>
                <p className="text-sm text-muted-foreground">
                  {calMonth}월에는 아직 서핑 기록이 없어요
                </p>
                <button
                  onClick={openCreate}
                  className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  + 기록 추가하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== 플로팅 작성 버튼 (FAB) - 그라데이션 + 그림자 ===== */}
      <button
        onClick={openCreate}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-primary to-blue-600
                   text-white rounded-full shadow-xl shadow-primary/30
                   flex items-center justify-center hover:shadow-primary/50
                   hover:scale-110 active:scale-95 transition-all z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ===== 작성/수정 모달 ===== */}
      {showForm && (
        <DiaryFormModal
          editEntry={editTarget}
          defaultBoardType={defaultBoardType}
          onClose={() => {
            setShowForm(false);
            setEditTarget(null);
          }}
          onSaved={handleFormSaved}
        />
      )}

      {/* ===== 삭제 확인 모달 ===== */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)} />
          <div className="relative bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold mb-1">기록 삭제</h3>
              <p className="text-sm text-muted-foreground">
                이 서핑 기록을 삭제하시겠어요?<br />
                삭제된 기록은 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2.5 border border-border rounded-xl font-medium
                           hover:bg-secondary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl font-medium
                           hover:bg-destructive/90 transition-colors disabled:opacity-50
                           flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
