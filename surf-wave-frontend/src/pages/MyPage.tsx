/**
 * @file MyPage.tsx
 * @description 마이인포 화면 - 프로필/통계/뱃지 탭 + 설정 시트
 *
 * 구조:
 * - 헤더: "마이인포" + 톱니바퀴(설정 시트)
 * - 내부 탭: [ 프로필 ] [ 통계 ] [ 뱃지 ]
 *   - 프로필: 아바타/닉네임/레벨/보드 + 레벨·보드 변경
 *   - 통계: 서핑 기록 통계 (세션/시간/스팟/만족도)
 *   - 뱃지: 카테고리별 59개 뱃지 그리드
 * - 설정 시트: 다이어리·자세연습 바로가기, 알림, 앱정보, 관리자, 로그아웃
 */

import { Settings, ChevronRight, Waves, Clock, MapPin, Star, BookOpen, Camera, Shield, Trophy, Bell, X, Check, AlertCircle, Pencil } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import type { SurfLevel, BoardType, UserInfo } from '../types';
import { api } from '../lib/api';
import { MyBoardsSection } from '../components/MyBoardsSection';

interface MyPageProps {
  surfLevel: SurfLevel;
  userInfo: UserInfo | null;
  onLogout: () => void;
  onLevelChange: (level: SurfLevel) => void;
  onBoardTypeChange: (boardType: BoardType) => void;
  onNotificationToggle: (enabled: boolean) => void;
  onNavigateToDiary: () => void;
  onNavigateToPoseTraining?: () => void;
  onNavigateToAdmin?: () => void;
  /** 아이디 변경 섹션 자동 열기 - 구글 가입자 팝업 [지금 설정]에서 true로 전달됨 */
  autoOpenUsernameEditor?: boolean;
  /** 자동 열기 처리 완료 알림 - App.tsx의 플래그 리셋용 */
  onUsernameEditorOpened?: () => void;
  /** 사용자 정보 갱신 알림 - 아이디/기타 프로필 변경 후 부모 상태 동기화용 */
  onUserInfoUpdated?: (updated: UserInfo) => void;
}

interface DiaryEntry {
  id: string;
  surfDate: string;
  durationMinutes: number;
  satisfaction: number;
  spot: { id: string; name: string; region: string } | null;
}

interface DiaryResponse {
  data: DiaryEntry[];
  meta: { totalItems: number };
}

interface BadgeItem {
  key: string;
  nameKo: string;
  descriptionKo: string;
  icon: string;
  category: string;
  isHidden: boolean;
  isEarned: boolean;
  earnedAt: string | null;
}

interface SurfStats {
  totalSessions: number;
  totalHours: number;
  uniqueSpots: number;
  avgSatisfaction: number;
  thisMonthSessions: number;
  topSpotName: string | null;
  topSpotCount: number;
}

/** 마이인포 내부 탭 */
type MyInfoTab = 'profile' | 'stats' | 'badges';

/** 뱃지 카테고리 탭 목록 */
const BADGE_CATEGORIES = [
  { key: 'ALL', label: '전체' },
  { key: 'PROFILE', label: '프로필' },
  { key: 'DIARY', label: '다이어리' },
  { key: 'RECORD', label: '기록' },
  { key: 'BOARD', label: '보드' },
  { key: 'SPOT', label: '스팟' },
  { key: 'TIME', label: '시간대' },
  { key: 'SATISFACTION', label: '만족도' },
  { key: 'STREAK', label: '연속' },
  { key: 'COMMUNITY', label: '커뮤니티' },
  { key: 'STORY', label: '스토리' },
  { key: 'LIMITED', label: '한정' },
  { key: 'META', label: '컬렉션' },
] as const;

/** 뱃지 아이콘 — 이미지 로드 실패 시 이모지 fallback */
function BadgeIcon({ imgSrc, emoji, large }: {
  imgSrc: string;
  emoji: string;
  large?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const size = large ? 'text-4xl w-20 h-20' : 'text-2xl w-14 h-14';

  if (imgFailed) {
    return (
      <div className={`${size} flex items-center justify-center bg-secondary`}>
        {emoji}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt=""
      className="w-full h-full object-cover scale-110"
      onError={() => setImgFailed(true)}
    />
  );
}

/** 획득일 "YYYY.MM.DD" 포맷 */
function formatBadgeDate(isoStr: string): string {
  const d = new Date(isoStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const LEVEL_LABELS: Record<SurfLevel, string> = {
  BEGINNER: '초급', INTERMEDIATE: '중급', ADVANCED: '상급', EXPERT: '전문가',
};
const LEVEL_COLORS: Record<SurfLevel, string> = {
  BEGINNER: '#32CD32', INTERMEDIATE: '#008CBA', ADVANCED: '#FF8C00', EXPERT: '#FF4444',
};
const ALL_LEVELS: SurfLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

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
const ALL_BOARDS: BoardType[] = ['LONGBOARD', 'FUNBOARD', 'MIDLENGTH', 'FISH', 'SHORTBOARD', 'SUP', 'BODYBOARD', 'FOIL', 'OTHER'];

export function MyPage({
  surfLevel, userInfo, onLogout, onLevelChange, onBoardTypeChange,
  onNotificationToggle, onNavigateToDiary, onNavigateToPoseTraining, onNavigateToAdmin,
  autoOpenUsernameEditor, onUsernameEditorOpened, onUserInfoUpdated,
}: MyPageProps) {
  /** 현재 내부 탭 */
  const [activeTab, setActiveTab] = useState<MyInfoTab>('profile');
  /** 설정 시트 열림 여부 */
  const [showSettings, setShowSettings] = useState(false);

  /** 레벨/보드 드롭다운 */
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);

  /** 다이어리 데이터 (통계용) */
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  /** 뱃지 데이터 */
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState<string>('ALL');
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  const currentBoard: BoardType = userInfo?.boardType ?? 'UNSET';
  const currentBoardFt = userInfo?.boardSizeFt;
  const [boardFtInput, setBoardFtInput] = useState(currentBoardFt?.toString() || '');

  /** ───── 아이디(username) 변경 상태 ───── */
  /** 아이디 변경 섹션 펼침 여부 (구글 신규가입자는 자동 펼침) */
  const [showUsernameEditor, setShowUsernameEditor] = useState(false);
  /** 입력 중인 새 아이디 */
  const [usernameInput, setUsernameInput] = useState('');
  /** 중복 확인 결과 - null=미확인, true=사용가능, false=중복 */
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  /** 중복 확인/저장 진행 중 상태 */
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameSaving, setUsernameSaving] = useState(false);
  /** 에러 메시지 (정규식 위반, 길이 등) */
  const [usernameError, setUsernameError] = useState<string | null>(null);
  /** 입력 필드 ref - 자동 펼침 시 포커스 이동 */
  const usernameInputRef = useRef<HTMLInputElement>(null);

  /** App.tsx에서 autoOpenUsernameEditor=true로 전달되면 자동 펼침 + 포커스 */
  useEffect(() => {
    if (autoOpenUsernameEditor) {
      setActiveTab('profile');
      setShowUsernameEditor(true);
      setTimeout(() => usernameInputRef.current?.focus(), 100);
      onUsernameEditorOpened?.();
    }
  }, [autoOpenUsernameEditor, onUsernameEditorOpened]);

  /** 아이디 정규식 검증 — 백엔드 DTO와 동일 (2~15자, 한글/영문/숫자/언더스코어) */
  const validateUsername = (val: string): string | null => {
    if (val.length < 2) return '아이디는 최소 2자 이상이어야 합니다';
    if (val.length > 15) return '아이디는 최대 15자까지 가능합니다';
    if (!/^[a-zA-Z0-9_가-힣]+$/.test(val)) return '한글, 영문, 숫자, 언더스코어(_)만 사용 가능합니다';
    return null;
  };

  /** 입력 변경 시 - 검증 + 중복 확인 결과 초기화 */
  const handleUsernameInputChange = (val: string) => {
    setUsernameInput(val);
    setUsernameAvailable(null);
    setUsernameError(val ? validateUsername(val) : null);
  };

  /** 아이디 중복 확인 - POST /api/v1/auth/check-username */
  const handleCheckUsername = async () => {
    const err = validateUsername(usernameInput);
    if (err) { setUsernameError(err); return; }
    if (usernameInput === userInfo?.username) {
      setUsernameError('현재 아이디와 동일합니다');
      return;
    }
    setUsernameChecking(true);
    setUsernameError(null);
    try {
      const res = await fetch(api('/api/v1/auth/check-username'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput }),
      });
      const data = await res.json();
      setUsernameAvailable(data.available);
      if (!data.available) setUsernameError('이미 사용 중인 아이디입니다');
    } catch {
      setUsernameError('중복 확인 중 오류가 발생했습니다');
    } finally {
      setUsernameChecking(false);
    }
  };

  /** 아이디 저장 - PATCH /api/v1/users/me */
  const handleSaveUsername = async () => {
    if (usernameAvailable !== true) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setUsernameSaving(true);
    try {
      const res = await fetch(api('/api/v1/users/me'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: usernameInput }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setUsernameError(data?.message || '저장에 실패했습니다');
        return;
      }
      const updated = await res.json();
      /** 부모(App.tsx)에 갱신된 userInfo 전달 → 전체 화면 동기화 */
      if (userInfo) {
        onUserInfoUpdated?.({ ...userInfo, username: updated.username });
      }
      /** 입력 초기화 + 섹션 닫기 */
      setUsernameInput('');
      setUsernameAvailable(null);
      setShowUsernameEditor(false);
    } catch {
      setUsernameError('저장 중 오류가 발생했습니다');
    } finally {
      setUsernameSaving(false);
    }
  };

  /** 다이어리 데이터 조회 (통계 계산용) */
  useEffect(() => {
    const fetchDiaryData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) { setStatsLoading(false); return; }
      try {
        const res = await fetch(api('/api/v1/diary?limit=100'), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) { setStatsLoading(false); return; }
        const json: DiaryResponse = await res.json();
        setDiaryEntries(json.data || []);
      } catch {
        console.warn('서핑 기록 조회 실패');
      } finally {
        setStatsLoading(false);
      }
    };
    fetchDiaryData();
  }, []);

  /** 뱃지 목록 조회 */
  useEffect(() => {
    const fetchBadges = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) { setBadgesLoading(false); return; }
      try {
        const res = await fetch(api('/api/v1/badges/me'), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) { setBadgesLoading(false); return; }
        const data: BadgeItem[] = await res.json();
        setBadges(data);
      } catch {
        console.warn('뱃지 조회 실패');
      } finally {
        setBadgesLoading(false);
      }
    };
    fetchBadges();
  }, []);

  const filteredBadges = useMemo(() => {
    if (selectedBadgeCategory === 'ALL') return badges;
    return badges.filter((b) => b.category === selectedBadgeCategory);
  }, [badges, selectedBadgeCategory]);

  const earnedCount = useMemo(() => badges.filter((b) => b.isEarned).length, [badges]);

  /** 서핑 통계 계산 */
  const stats: SurfStats = useMemo(() => {
    if (diaryEntries.length === 0) {
      return { totalSessions: 0, totalHours: 0, uniqueSpots: 0, avgSatisfaction: 0, thisMonthSessions: 0, topSpotName: null, topSpotCount: 0 };
    }
    const totalMinutes = diaryEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const totalSatisfaction = diaryEntries.reduce((sum, e) => sum + (e.satisfaction || 0), 0);
    const avgSatisfaction = Math.round((totalSatisfaction / diaryEntries.length) * 10) / 10;
    const spotIds = new Set(diaryEntries.map(e => e.spot?.id).filter(Boolean));
    const now = new Date();
    const thisYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthSessions = diaryEntries.filter(e => e.surfDate?.startsWith(thisYearMonth)).length;
    const spotCounts = new Map<string, { name: string; count: number }>();
    diaryEntries.forEach(e => {
      if (e.spot) {
        const ex = spotCounts.get(e.spot.id);
        ex ? ex.count++ : spotCounts.set(e.spot.id, { name: e.spot.name, count: 1 });
      }
    });
    let topSpotName: string | null = null;
    let topSpotCount = 0;
    spotCounts.forEach(({ name, count }) => { if (count > topSpotCount) { topSpotName = name; topSpotCount = count; } });
    return { totalSessions: diaryEntries.length, totalHours, uniqueSpots: spotIds.size, avgSatisfaction, thisMonthSessions, topSpotName, topSpotCount };
  }, [diaryEntries]);

  return (
    <div className="min-h-screen pb-20">
      {/* ── 헤더 ── */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">마이인포</h1>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto page-transition">

        {/* ── 내부 탭 ── */}
        <div className="flex border-b border-border bg-card sticky top-[61px] z-30">
          {(['profile', 'stats', 'badges'] as MyInfoTab[]).map((tab) => {
            const labels: Record<MyInfoTab, string> = { profile: '프로필', stats: '다이어리', badges: '뱃지' };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                {labels[tab]}
                {tab === 'badges' && earnedCount > 0 && (
                  <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {earnedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-5">

          {/* ══════════════════════════════ 프로필 탭 ══════════════════════════════ */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* 프로필 카드 — 우측 상단 ✏️ 클릭 시 아이디 변경 모달 */}
              <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl p-6 border border-primary/30 relative">
                {/* 우측 상단 수정 버튼 — 아이디 변경 모달 트리거 */}
                <button
                  onClick={() => {
                    setUsernameInput(userInfo?.username || '');
                    setUsernameAvailable(null);
                    setUsernameError(null);
                    setShowUsernameEditor(true);
                    setTimeout(() => usernameInputRef.current?.focus(), 100);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-card/70 hover:bg-card transition-colors"
                  aria-label="아이디 변경"
                >
                  <Pencil className="w-3.5 h-3.5 text-foreground" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl">
                    🏄‍♂️
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold mb-1 truncate">{userInfo?.username || '서퍼'}</h2>
                    {userInfo?.email && (
                      <p className="text-sm text-muted-foreground mb-2 truncate">{userInfo.email}</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <div
                        className="inline-block px-3 py-1 text-sm rounded-full font-medium"
                        style={{ backgroundColor: `${LEVEL_COLORS[surfLevel]}20`, color: LEVEL_COLORS[surfLevel] }}
                      >
                        {LEVEL_LABELS[surfLevel]}
                      </div>
                      <div
                        className="inline-block px-3 py-1 text-sm rounded-full font-medium"
                        style={{ backgroundColor: `${BOARD_COLORS[currentBoard]}20`, color: BOARD_COLORS[currentBoard] }}
                      >
                        {BOARD_LABELS[currentBoard]}{currentBoardFt ? ` ${currentBoardFt}ft` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 내 보드 컬렉션 — 여러 보드 등록/관리 */}
              <MyBoardsSection />

              {/* 자세 연습 바로가기 */}
              <button
                onClick={onNavigateToPoseTraining}
                className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">자세 연습</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">실시간 포즈 감지</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>


              {/* 서핑 레벨 변경 — 보드 타입은 "내 보드" 섹션으로 이관됨 */}
              <div className="bg-card border border-border rounded-xl">
                <button
                  onClick={() => setShowLevelPicker(!showLevelPicker)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
                >
                  <span className="text-sm font-medium">서핑 레벨</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: LEVEL_COLORS[surfLevel] }}>{LEVEL_LABELS[surfLevel]}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
                {showLevelPicker && (
                  <div className="p-4 bg-secondary/50 space-y-2 border-t border-border">
                    {ALL_LEVELS.map((level) => (
                      <button
                        key={level}
                        onClick={() => { onLevelChange(level); setShowLevelPicker(false); }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          surfLevel === level ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="font-medium" style={{ color: LEVEL_COLORS[level] }}>{LEVEL_LABELS[level]}</span>
                        {surfLevel === level && <span className="text-primary text-sm">현재</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════ 통계 탭 ══════════════════════════════ */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* 로딩 스켈레톤 */}
              {statsLoading && (
                <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="text-center">
                        <div className="h-7 bg-secondary rounded w-10 mx-auto mb-1" />
                        <div className="h-3 bg-secondary rounded w-8 mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 통계 있을 때 */}
              {!statsLoading && stats.totalSessions > 0 && (
                <>
                  {/* 핵심 수치 4개 */}
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center">
                        <Waves className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-xl font-black text-foreground">{stats.totalSessions}</p>
                        <p className="text-[10px] text-muted-foreground">세션</p>
                      </div>
                      <div className="text-center">
                        <Clock className="w-4 h-4 text-green-400 mx-auto mb-1" />
                        <p className="text-xl font-black text-foreground">{stats.totalHours}</p>
                        <p className="text-[10px] text-muted-foreground">시간</p>
                      </div>
                      <div className="text-center">
                        <MapPin className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                        <p className="text-xl font-black text-foreground">{stats.uniqueSpots}</p>
                        <p className="text-[10px] text-muted-foreground">스팟</p>
                      </div>
                      <div className="text-center">
                        <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                        <p className="text-xl font-black text-foreground">{stats.avgSatisfaction}</p>
                        <p className="text-[10px] text-muted-foreground">만족도</p>
                      </div>
                    </div>
                    {/* 이번 달 + 최다 방문 스팟 */}
                    <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">이번 달 서핑</span>
                        <span className="font-semibold text-foreground">
                          {stats.thisMonthSessions > 0 ? `${stats.thisMonthSessions}회` : '아직 없어요'}
                        </span>
                      </div>
                      {stats.topSpotName && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">최다 방문 스팟</span>
                          <span className="font-semibold text-foreground">{stats.topSpotName} ({stats.topSpotCount}회)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 다이어리 바로가기 */}
                  <button
                    onClick={onNavigateToDiary}
                    className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">서핑 다이어리 전체 보기</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </>
              )}

              {/* 기록 없을 때 */}
              {!statsLoading && stats.totalSessions === 0 && (
                <div className="bg-card border border-border rounded-xl text-center py-12 px-4">
                  <Waves className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">아직 서핑 기록이 없어요</p>
                  <p className="text-[11px] text-muted-foreground mb-4">다이어리에 기록을 남기면 통계가 표시돼요</p>
                  <button
                    onClick={onNavigateToDiary}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    다이어리 열기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════ 뱃지 탭 ══════════════════════════════ */}
          {activeTab === 'badges' && (
            <div>
              {/* 획득 수 */}
              {!badgesLoading && badges.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    내 뱃지
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium">{earnedCount}/{badges.length}개 획득</span>
                </div>
              )}

              {/* 카테고리 탭 */}
              {!badgesLoading && badges.length > 0 && (
                <div className="flex gap-1.5 pb-3 overflow-x-auto no-scrollbar">
                  {BADGE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedBadgeCategory(cat.key)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedBadgeCategory === cat.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 로딩 스켈레톤 */}
              {badgesLoading && (
                <div className="grid grid-cols-4 gap-3 animate-pulse">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 rounded-full bg-secondary" />
                      <div className="h-2.5 w-10 bg-secondary rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* 뱃지 그리드 */}
              {!badgesLoading && filteredBadges.length > 0 && (
                <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                  {filteredBadges.map((badge) => (
                    <button
                      key={badge.key}
                      onClick={() => setSelectedBadge(badge)}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div
                        className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center transition-transform group-active:scale-95 ${
                          badge.isEarned ? 'ring-2 ring-yellow-300 shadow-sm' : 'opacity-35 grayscale'
                        }`}
                      >
                        <BadgeIcon imgSrc={`/badges/${badge.key}.png`} emoji={badge.icon} />
                      </div>
                      <span className={`text-[10px] text-center leading-tight font-medium line-clamp-2 w-full ${
                        badge.isEarned ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {badge.nameKo}
                      </span>
                      {badge.isEarned && badge.earnedAt && (
                        <span className="text-[9px] text-primary font-medium">{formatBadgeDate(badge.earnedAt)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!badgesLoading && badges.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">뱃지 정보를 불러올 수 없어요</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── 아이디 변경 모달 — 프로필 카드 ✏️ 클릭 시 노출 ── */}
      {showUsernameEditor && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={() => setShowUsernameEditor(false)}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">아이디 변경</h3>
              <button
                onClick={() => setShowUsernameEditor(false)}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 안내 문구 */}
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              2~15자 한글/영문/숫자/언더스코어(_)만 사용 가능해요.
            </p>

            {/* 입력 + 중복확인 */}
            <div className="flex gap-2 mb-2">
              <input
                ref={usernameInputRef}
                type="text"
                value={usernameInput}
                onChange={(e) => handleUsernameInputChange(e.target.value)}
                placeholder="새 아이디"
                maxLength={15}
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleCheckUsername}
                disabled={!usernameInput || usernameChecking || !!validateUsername(usernameInput)}
                className="px-3 py-2 bg-primary text-primary-foreground text-xs rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {usernameChecking ? '확인중...' : '중복확인'}
              </button>
            </div>

            {/* 검증 결과 메시지 */}
            {usernameError && (
              <div className="flex items-center gap-1.5 text-[11px] text-destructive mb-3">
                <AlertCircle className="w-3 h-3" />
                <span>{usernameError}</span>
              </div>
            )}
            {usernameAvailable === true && (
              <div className="flex items-center gap-1.5 text-[11px] text-green-600 mb-3">
                <Check className="w-3 h-3" />
                <span>사용 가능한 아이디예요</span>
              </div>
            )}

            {/* 저장 버튼 */}
            <button
              onClick={handleSaveUsername}
              disabled={usernameAvailable !== true || usernameSaving}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {usernameSaving ? '저장 중...' : '아이디 저장'}
            </button>
          </div>
        </div>
      )}

      {/* ── 뱃지 상세 팝업 ── */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setSelectedBadge(null)}>
          <div className="bg-card rounded-t-2xl w-full max-w-md p-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className={`w-20 h-20 rounded-full overflow-hidden ${selectedBadge.isEarned ? 'ring-2 ring-yellow-300 shadow-md' : 'opacity-40 grayscale'}`}>
                <BadgeIcon imgSrc={`/badges/${selectedBadge.key}.png`} emoji={selectedBadge.icon} large />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold">{selectedBadge.nameKo}</h3>
                <span className="text-xs text-muted-foreground">{selectedBadge.category}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center mb-4">{selectedBadge.descriptionKo}</p>
            {selectedBadge.isEarned && selectedBadge.earnedAt && (
              <p className="text-xs text-primary text-center font-medium mb-4">
                🏆 {formatBadgeDate(selectedBadge.earnedAt)} 획득
              </p>
            )}
            {!selectedBadge.isEarned && (
              <p className="text-xs text-muted-foreground text-center mb-4">아직 획득하지 못한 뱃지예요</p>
            )}
            <button onClick={() => setSelectedBadge(null)} className="w-full py-3 bg-secondary rounded-xl text-sm font-medium">닫기</button>
          </div>
        </div>
      )}

      {/* ── 설정 시트 ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="bg-card rounded-t-2xl w-full max-w-md pb-10" onClick={(e) => e.stopPropagation()}>
            {/* 시트 헤더 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <h3 className="text-base font-bold">설정</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-border">
              {/* 알림 설정 */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm">알림 설정</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {userInfo?.notificationsEnabled !== false ? '서핑 컨디션 알림을 받고 있어요' : '알림이 꺼져 있어요'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={userInfo?.notificationsEnabled !== false}
                    onChange={(e) => onNotificationToggle(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* 관리자 패널 — ADMIN 계정에만 표시 */}
              {userInfo?.role === 'ADMIN' && (
                <button
                  onClick={() => { setShowSettings(false); onNavigateToAdmin?.(); }}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400 font-medium">관리자 패널</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              )}

              {/* 로그아웃 */}
              <button
                onClick={() => { setShowSettings(false); onLogout(); }}
                className="w-full text-left px-5 py-4 hover:bg-secondary transition-colors text-destructive text-sm"
              >
                로그아웃
              </button>

              {/* 앱 정보 — 가장 하단 */}
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm text-muted-foreground">앱 정보</span>
                <span className="text-sm text-muted-foreground">v1.4.2</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
