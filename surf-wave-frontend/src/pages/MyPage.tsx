/**
 * @file MyPage.tsx
 * @description 마이페이지 화면 - 프로필, 서핑 통계, 레벨/보드 변경, 알림 설정, 로그아웃
 *
 * 표시 정보:
 * 1. 프로필 카드: 아바타 + 닉네임 + 레벨/보드 배지
 * 2. 나의 서핑 기록 통계 카드: 총 세션, 총 시간, 방문 스팟, 평균 만족도
 *    - API: GET /api/v1/diary?limit=200 → 클라이언트에서 통계 집계
 *    - 이번 달 세션 수 + 최다 방문 스팟 표시
 * 3. 설정 목록: 레벨 변경, 보드 변경, 알림 토글, 앱 정보, 로그아웃
 */

import { Settings, ChevronRight, Waves, Clock, MapPin, Star, BookOpen, Camera, Shield, Trophy } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { SurfLevel, BoardType, UserInfo } from '../types';
import { api } from '../lib/api';

interface MyPageProps {
  /** 현재 서핑 레벨 */
  surfLevel: SurfLevel;
  /** 로그인된 사용자 정보 (닉네임, 이메일, 보드 타입 등) */
  userInfo: UserInfo | null;
  /** 로그아웃 핸들러 - localStorage 초기화 + welcome 화면 이동 */
  onLogout: () => void;
  /** 레벨 변경 핸들러 - 서버 API 호출 + 로컬 상태 업데이트 */
  onLevelChange: (level: SurfLevel) => void;
  /** 보드 타입 변경 핸들러 - 서버 API 호출 + 로컬 상태 업데이트 */
  onBoardTypeChange: (boardType: BoardType) => void;
  /** 알림 설정 토글 핸들러 - PATCH /api/v1/users/me 호출 */
  onNotificationToggle: (enabled: boolean) => void;
  /** 서핑 다이어리 페이지로 이동 핸들러 */
  onNavigateToDiary: () => void;
  /** 자세 연습 페이지로 이동 핸들러 */
  onNavigateToPoseTraining?: () => void;
  /** 관리자 패널로 이동 핸들러 — role=ADMIN인 경우에만 표시 */
  onNavigateToAdmin?: () => void;
}

/**
 * 다이어리 항목 타입 - GET /api/v1/diary API 응답의 data[] 배열 내 각 항목
 * 백엔드 SurfDiary 엔티티 기반
 */
interface DiaryEntry {
  /** 다이어리 UUID */
  id: string;
  /** 서핑 날짜 (YYYY-MM-DD) */
  surfDate: string;
  /** 서핑 시간 (분) */
  durationMinutes: number;
  /** 만족도 (1~5) */
  satisfaction: number;
  /** 스팟 정보 (join된 데이터) */
  spot: {
    id: string;
    name: string;
    region: string;
  } | null;
}

/**
 * 다이어리 API 응답 구조
 * GET /api/v1/diary?limit=200
 */
interface DiaryResponse {
  /** 다이어리 항목 배열 */
  data: DiaryEntry[];
  /** 페이지네이션 메타데이터 */
  meta: {
    totalItems: number;
  };
}

/**
 * 뱃지 항목 타입 - GET /api/v1/badges/me API 응답의 각 항목
 */
interface BadgeItem {
  /** 뱃지 고유 키 (WELCOME, FIRST_DIARY 등) */
  key: string;
  /** 뱃지 이름 (한국어) */
  nameKo: string;
  /** 뱃지 설명 (히든 미획득 시 ???로 표시됨) */
  descriptionKo: string;
  /** 뱃지 아이콘 이모지 (히든 미획득 시 🔒) */
  icon: string;
  /** 뱃지 카테고리 */
  category: string;
  /** 히든 뱃지 여부 */
  isHidden: boolean;
  /** 획득 여부 */
  isEarned: boolean;
  /** 획득 일시 (ISO 문자열, 미획득 시 null) */
  earnedAt: string | null;
}

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
] as const;

/**
 * 뱃지 아이콘 컴포넌트 — 이미지 로드 실패 시 이모지로 fallback
 */
function BadgeIcon({ imgSrc, emoji, isEarned, large }: {
  imgSrc: string;
  emoji: string;
  isEarned: boolean;
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

/** 획득일을 "YYYY.MM.DD" 형식으로 포맷 */
function formatBadgeDate(isoStr: string): string {
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/**
 * 서핑 통계 집계 결과 - 클라이언트에서 계산
 */
interface SurfStats {
  /** 총 서핑 세션 수 */
  totalSessions: number;
  /** 총 서핑 시간 (시간 단위, 소수점 1자리) */
  totalHours: number;
  /** 방문한 고유 스팟 수 */
  uniqueSpots: number;
  /** 평균 만족도 (1~5, 소수점 1자리) */
  avgSatisfaction: number;
  /** 이번 달 서핑 세션 수 */
  thisMonthSessions: number;
  /** 가장 많이 방문한 스팟 이름 (없으면 null) */
  topSpotName: string | null;
  /** 가장 많이 방문한 스팟의 방문 횟수 */
  topSpotCount: number;
}

/** 레벨별 한국어 라벨 */
const LEVEL_LABELS: Record<SurfLevel, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '상급',
  EXPERT: '전문가',
};

/** 레벨별 테마 색상 */
const LEVEL_COLORS: Record<SurfLevel, string> = {
  BEGINNER: '#32CD32',
  INTERMEDIATE: '#008CBA',
  ADVANCED: '#FF8C00',
  EXPERT: '#FF4444',
};

/** 전체 레벨 목록 - 레벨 변경 드롭다운에 사용 */
const ALL_LEVELS: SurfLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

/** 보드 타입별 한국어 라벨 — 백엔드 BoardType 8종류 + MIDLENGTH(레거시) + UNSET */
const BOARD_LABELS: Record<BoardType, string> = {
  LONGBOARD: '롱보드',
  FUNBOARD: '펀보드',
  MIDLENGTH: '미드렝스',
  FISH: '피쉬',
  SHORTBOARD: '숏보드',
  SUP: 'SUP',
  BODYBOARD: '바디보드',
  FOIL: '포일',
  OTHER: '기타',
  UNSET: '미설정',
};

/** 보드 타입별 테마 색상 */
const BOARD_COLORS: Record<BoardType, string> = {
  LONGBOARD: '#32CD32',
  FUNBOARD: '#008CBA',
  MIDLENGTH: '#6366F1',
  FISH: '#EC4899',
  SHORTBOARD: '#FF8C00',
  SUP: '#14B8A6',
  BODYBOARD: '#8B5CF6',
  FOIL: '#0EA5E9',
  OTHER: '#6B7280',
  UNSET: '#888888',
};

/** 선택 가능한 보드 타입 목록 (UNSET 제외, 프로필 변경 드롭다운에 표시) */
const ALL_BOARDS: BoardType[] = ['LONGBOARD', 'FUNBOARD', 'MIDLENGTH', 'FISH', 'SHORTBOARD', 'SUP', 'BODYBOARD', 'FOIL', 'OTHER'];

export function MyPage({ surfLevel, userInfo, onLogout, onLevelChange, onBoardTypeChange, onNotificationToggle, onNavigateToDiary, onNavigateToPoseTraining, onNavigateToAdmin }: MyPageProps) {
  /** 레벨 변경 드롭다운 열림/닫힘 상태 */
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  /** 보드 타입 변경 드롭다운 열림/닫힘 상태 */
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  /** 다이어리 원본 데이터 (API 응답) */
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  /** 통계 데이터 로딩 상태 */
  const [statsLoading, setStatsLoading] = useState(true);
  /** 뱃지 목록 데이터 (API 응답) */
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  /** 뱃지 로딩 상태 */
  const [badgesLoading, setBadgesLoading] = useState(true);
  /** 현재 선택된 뱃지 카테고리 탭 */
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState<string>('ALL');
  /** 선택된 뱃지 (설명 팝업) */
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  /** 현재 보드 타입 - userInfo에서 가져오거나 기본값 UNSET */
  const currentBoard: BoardType = userInfo?.boardType ?? 'UNSET';
  /** 보드 길이 (피트) — userInfo에서 가져오거나 빈 문자열 */
  const currentBoardFt = userInfo?.boardSizeFt;
  /** 보드 길이 입력값 (마이페이지 보드 변경 시) */
  const [boardFtInput, setBoardFtInput] = useState(currentBoardFt?.toString() || '');

  /**
   * 다이어리 데이터 가져오기 (통계 계산용)
   * GET /api/v1/diary?limit=200 (인증 필요)
   * 마이페이지 진입 시 1회 호출
   */
  useEffect(() => {
    const fetchDiaryData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setStatsLoading(false);
        return;
      }

      try {
        /** limit 최대 100 (백엔드 PaginationDto @Max(100) 제한) */
        const res = await fetch(api('/api/v1/diary?limit=100'), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          setStatsLoading(false);
          return;
        }
        const json: DiaryResponse = await res.json();
        setDiaryEntries(json.data || []);
      } catch {
        /** API 실패해도 통계 영역만 빈 상태로 표시 - 다른 기능에 영향 없음 */
        console.warn('서핑 기록 조회 실패');
      } finally {
        setStatsLoading(false);
      }
    };

    fetchDiaryData();
  }, []);

  /**
   * 뱃지 목록 가져오기
   * GET /api/v1/badges/me (인증 필요)
   * 전체 뱃지 + 획득 여부 + 획득일 반환
   */
  useEffect(() => {
    const fetchBadges = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setBadgesLoading(false);
        return;
      }
      try {
        const res = await fetch(api('/api/v1/badges/me'), {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          setBadgesLoading(false);
          return;
        }
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

  /** 현재 카테고리 탭에서 표시할 뱃지 목록 */
  const filteredBadges = useMemo(() => {
    if (selectedBadgeCategory === 'ALL') return badges;
    return badges.filter((b) => b.category === selectedBadgeCategory);
  }, [badges, selectedBadgeCategory]);

  /** 획득한 뱃지 수 */
  const earnedCount = useMemo(() => badges.filter((b) => b.isEarned).length, [badges]);

  /**
   * 다이어리 데이터로 서핑 통계 계산 (메모이제이션)
   * 총 세션, 총 시간, 방문 스팟, 평균 만족도, 이번 달 세션, 최다 방문 스팟
   */
  const stats: SurfStats = useMemo(() => {
    /** 다이어리가 비어있으면 기본값 반환 */
    if (diaryEntries.length === 0) {
      return {
        totalSessions: 0,
        totalHours: 0,
        uniqueSpots: 0,
        avgSatisfaction: 0,
        thisMonthSessions: 0,
        topSpotName: null,
        topSpotCount: 0,
      };
    }

    /** 총 서핑 시간 (분 → 시간 변환) */
    const totalMinutes = diaryEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    /** 평균 만족도 (1~5점) */
    const totalSatisfaction = diaryEntries.reduce((sum, e) => sum + (e.satisfaction || 0), 0);
    const avgSatisfaction = Math.round((totalSatisfaction / diaryEntries.length) * 10) / 10;

    /** 고유 스팟 수 - Set으로 중복 제거 */
    const spotIds = new Set(diaryEntries.map(e => e.spot?.id).filter(Boolean));

    /** 이번 달 세션 수 - 현재 년/월과 서핑 날짜 비교 */
    const now = new Date();
    const thisYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthSessions = diaryEntries.filter(e =>
      e.surfDate && e.surfDate.startsWith(thisYearMonth)
    ).length;

    /** 가장 많이 방문한 스팟 계산 - 스팟별 방문 횟수 집계 */
    const spotCounts = new Map<string, { name: string; count: number }>();
    diaryEntries.forEach(e => {
      if (e.spot) {
        const existing = spotCounts.get(e.spot.id);
        if (existing) {
          existing.count++;
        } else {
          spotCounts.set(e.spot.id, { name: e.spot.name, count: 1 });
        }
      }
    });

    /** 방문 횟수 기준 내림차순 정렬 → 1위 추출 */
    let topSpotName: string | null = null;
    let topSpotCount = 0;
    spotCounts.forEach(({ name, count }) => {
      if (count > topSpotCount) {
        topSpotName = name;
        topSpotCount = count;
      }
    });

    return {
      totalSessions: diaryEntries.length,
      totalHours,
      uniqueSpots: spotIds.size,
      avgSatisfaction,
      thisMonthSessions,
      topSpotName,
      topSpotCount,
    };
  }, [diaryEntries]);

  return (
    <div className="min-h-screen pb-20">
      {/* 상단 헤더 */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">마이페이지</h1>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 page-transition">
        {/* 프로필 카드 - 아바타 + 닉네임 + 레벨/보드 배지 */}
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl p-6 border border-primary/30 mb-6">
          <div className="flex items-center gap-4">
            {/* 프로필 아바타 - 이미지가 없으면 기본 이모지 표시 */}
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl">
              🏄‍♂️
            </div>
            <div className="flex-1">
              {/* 닉네임 */}
              <h2 className="text-xl font-bold mb-1">
                {userInfo?.nickname || '서퍼'}
              </h2>
              {/* 이메일 표시 */}
              {userInfo?.email && (
                <p className="text-sm text-muted-foreground mb-2">{userInfo.email}</p>
              )}
              {/* 서핑 레벨 + 보드 타입 배지 */}
              <div className="flex gap-2 flex-wrap">
                <div
                  className="inline-block px-3 py-1 text-sm rounded-full font-medium"
                  style={{
                    backgroundColor: `${LEVEL_COLORS[surfLevel]}20`,
                    color: LEVEL_COLORS[surfLevel],
                  }}
                >
                  {LEVEL_LABELS[surfLevel]}
                </div>
                <div
                  className="inline-block px-3 py-1 text-sm rounded-full font-medium"
                  style={{
                    backgroundColor: `${BOARD_COLORS[currentBoard]}20`,
                    color: BOARD_COLORS[currentBoard],
                  }}
                >
                  {BOARD_LABELS[currentBoard]}{currentBoardFt ? ` ${currentBoardFt}ft` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 나의 서핑 기록 통계 카드 ===== */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          {/* 섹션 제목 + 전체 보기 버튼 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-primary" />
              나의 서핑 기록
            </h3>
            <button
              onClick={onNavigateToDiary}
              className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-0.5"
            >
              전체 보기
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* 통계 로딩 스켈레톤 */}
          {statsLoading && (
            <div className="grid grid-cols-4 gap-3 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="text-center">
                  <div className="h-7 bg-secondary rounded w-10 mx-auto mb-1" />
                  <div className="h-3 bg-secondary rounded w-8 mx-auto" />
                </div>
              ))}
            </div>
          )}

          {/* 통계 데이터가 있을 때 - 4칸 그리드로 핵심 수치 표시 */}
          {!statsLoading && stats.totalSessions > 0 && (
            <>
              {/* 상단: 4개 핵심 통계 수치 */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {/* 총 세션 수 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5">
                    <Waves className="w-3 h-3 text-blue-400" />
                  </div>
                  <p className="text-xl font-black text-foreground">{stats.totalSessions}</p>
                  <p className="text-[10px] text-muted-foreground">세션</p>
                </div>
                {/* 총 서핑 시간 (시간 단위) */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5">
                    <Clock className="w-3 h-3 text-green-400" />
                  </div>
                  <p className="text-xl font-black text-foreground">{stats.totalHours}</p>
                  <p className="text-[10px] text-muted-foreground">시간</p>
                </div>
                {/* 방문 스팟 수 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5">
                    <MapPin className="w-3 h-3 text-orange-400" />
                  </div>
                  <p className="text-xl font-black text-foreground">{stats.uniqueSpots}</p>
                  <p className="text-[10px] text-muted-foreground">스팟</p>
                </div>
                {/* 평균 만족도 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5">
                    <Star className="w-3 h-3 text-yellow-400" />
                  </div>
                  <p className="text-xl font-black text-foreground">{stats.avgSatisfaction}</p>
                  <p className="text-[10px] text-muted-foreground">만족도</p>
                </div>
              </div>

              {/* 하단: 이번 달 + 최다 방문 스팟 요약 */}
              <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5">
                {/* 이번 달 서핑 횟수 */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">이번 달 서핑</span>
                  <span className="font-semibold text-foreground">
                    {stats.thisMonthSessions > 0
                      ? `${stats.thisMonthSessions}회`
                      : '아직 없어요'
                    }
                  </span>
                </div>
                {/* 가장 많이 간 스팟 */}
                {stats.topSpotName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">최다 방문 스팟</span>
                    <span className="font-semibold text-foreground">
                      {stats.topSpotName} ({stats.topSpotCount}회)
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 기록이 없을 때 - 빈 상태 안내 + 다이어리 바로가기 */}
          {!statsLoading && stats.totalSessions === 0 && (
            <div className="text-center py-4">
              <Waves className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                아직 서핑 기록이 없어요
              </p>
              <p className="text-[11px] text-muted-foreground mb-3">
                서핑 다이어리에 기록을 남기면{'\n'}여기에 통계가 표시돼요
              </p>
              <button
                onClick={onNavigateToDiary}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium
                           hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                다이어리 열기
              </button>
            </div>
          )}
        </div>

        {/* ===== 뱃지/업적 섹션 ===== */}
        <div className="bg-card border border-border rounded-xl mb-6">
          {/* 섹션 헤더 — 제목 + 획득 수 */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-yellow-500" />
              내 뱃지
            </h3>
            {!badgesLoading && badges.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">
                {earnedCount}/{badges.length}개 획득
              </span>
            )}
          </div>

          {/* 카테고리 탭 - 가로 스크롤 */}
          {!badgesLoading && badges.length > 0 && (
            <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
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

          {/* 뱃지 로딩 스켈레톤 */}
          {badgesLoading && (
            <div className="grid grid-cols-4 gap-3 px-4 pb-5 animate-pulse">
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
            <div className="grid grid-cols-4 gap-x-2 gap-y-4 px-4 pb-5">
              {filteredBadges.map((badge) => {
                /** /badges/KEY.png 이미지 존재 여부 — 43개는 실제 이미지, 나머지는 이모지 */
                const imgSrc = `/badges/${badge.key}.png`;
                return (
                  <button
                    key={badge.key}
                    onClick={() => setSelectedBadge(badge)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    {/* 뱃지 아이콘 원형 */}
                    <div
                      className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center transition-transform group-active:scale-95 ${
                        badge.isEarned
                          ? 'ring-2 ring-yellow-300 shadow-sm'
                          : 'opacity-35 grayscale'
                      }`}
                    >
                      <BadgeIcon imgSrc={imgSrc} emoji={badge.icon} isEarned={badge.isEarned} />
                    </div>
                    {/* 뱃지 이름 */}
                    <span
                      className={`text-[10px] text-center leading-tight font-medium line-clamp-2 w-full ${
                        badge.isEarned ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {badge.nameKo}
                    </span>
                    {/* 획득일 */}
                    {badge.isEarned && badge.earnedAt && (
                      <span className="text-[9px] text-primary font-medium">
                        {formatBadgeDate(badge.earnedAt)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 뱃지 없음 (비로그인 등) */}
          {!badgesLoading && badges.length === 0 && (
            <div className="text-center py-8 px-4">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">뱃지 정보를 불러올 수 없어요</p>
            </div>
          )}
        </div>

        {/* 뱃지 상세 팝업 */}
        {selectedBadge && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setSelectedBadge(null)}
          >
            <div
              className="bg-card rounded-t-2xl w-full max-w-md p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 뱃지 아이콘 + 이름 */}
              <div className="flex flex-col items-center gap-3 mb-4">
                <div
                  className={`w-20 h-20 rounded-full overflow-hidden ${
                    selectedBadge.isEarned
                      ? 'ring-2 ring-yellow-300 shadow-md'
                      : 'opacity-40 grayscale'
                  }`}
                >
                  <BadgeIcon
                    imgSrc={`/badges/${selectedBadge.key}.png`}
                    emoji={selectedBadge.icon}
                    isEarned={selectedBadge.isEarned}
                    large
                  />
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-bold">{selectedBadge.nameKo}</h4>
                  {selectedBadge.isHidden && !selectedBadge.isEarned && (
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      히든 뱃지
                    </span>
                  )}
                </div>
              </div>
              {/* 설명 */}
              <p className="text-sm text-muted-foreground text-center mb-4">
                {selectedBadge.descriptionKo}
              </p>
              {/* 획득일 */}
              {selectedBadge.isEarned && selectedBadge.earnedAt && (
                <p className="text-xs text-primary text-center font-medium mb-4">
                  🏆 {formatBadgeDate(selectedBadge.earnedAt)} 획득
                </p>
              )}
              {/* 미획득 상태 */}
              {!selectedBadge.isEarned && (
                <p className="text-xs text-muted-foreground text-center mb-4">
                  아직 획득하지 못한 뱃지예요
                </p>
              )}
              {/* 닫기 버튼 */}
              <button
                onClick={() => setSelectedBadge(null)}
                className="w-full py-3 bg-secondary rounded-xl text-sm font-medium hover:bg-secondary/70 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 설정 목록 */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {/* 서핑 다이어리 바로가기 - 기록 관리 페이지로 이동 */}
          <button
            onClick={onNavigateToDiary}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>서핑 다이어리</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* 자세 연습 바로가기 — 카메라 실시간 포즈 감지 페이지로 이동 */}
          <button
            onClick={onNavigateToPoseTraining}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <span>자세 연습</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">실시간 포즈 감지</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>

          {/* 서핑 레벨 변경 버튼 */}
          <button
            onClick={() => {
              setShowLevelPicker(!showLevelPicker);
              setShowBoardPicker(false); // 다른 피커 닫기
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
          >
            <span>서핑 레벨 변경</span>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: LEVEL_COLORS[surfLevel] }}>
                {LEVEL_LABELS[surfLevel]}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>

          {/* 레벨 선택 드롭다운 */}
          {showLevelPicker && (
            <div className="p-4 bg-secondary/50 space-y-2">
              {ALL_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    onLevelChange(level);
                    setShowLevelPicker(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    surfLevel === level
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium" style={{ color: LEVEL_COLORS[level] }}>
                    {LEVEL_LABELS[level]}
                  </span>
                  {surfLevel === level && (
                    <span className="text-primary text-sm">현재</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 보드 타입 변경 버튼 */}
          <button
            onClick={() => {
              setShowBoardPicker(!showBoardPicker);
              setShowLevelPicker(false); // 다른 피커 닫기
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
          >
            <span>보드 타입 변경</span>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: BOARD_COLORS[currentBoard] }}>
                {BOARD_LABELS[currentBoard]}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>

          {/* 보드 타입 선택 드롭다운 */}
          {showBoardPicker && (
            <div className="p-4 bg-secondary/50 space-y-2">
              {/* 보드 타입 선택 목록 */}
              {ALL_BOARDS.map((board) => (
                <button
                  key={board}
                  onClick={() => {
                    onBoardTypeChange(board);
                    setShowBoardPicker(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    currentBoard === board
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium" style={{ color: BOARD_COLORS[board] }}>
                    {BOARD_LABELS[board]}
                  </span>
                  {currentBoard === board && (
                    <span className="text-primary text-sm">현재</span>
                  )}
                </button>
              ))}

              {/* 보드 길이(피트) 입력 — 선택사항 */}
              <div className="pt-2 border-t border-border/50">
                <label className="text-xs text-muted-foreground mb-1 block">보드 길이 (선택)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={boardFtInput}
                    onChange={(e) => setBoardFtInput(e.target.value)}
                    placeholder="예: 6.2"
                    min={3.0}
                    max={12.0}
                    step={0.1}
                    className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-center
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="text-sm text-muted-foreground">ft</span>
                  <button
                    onClick={async () => {
                      /** 피트 값을 서버에 저장 — PATCH /api/v1/users/me */
                      const token = localStorage.getItem('accessToken');
                      if (!token) return;
                      const ft = boardFtInput.trim() ? parseFloat(boardFtInput) : null;
                      try {
                        await fetch(api('/api/v1/users/me'), {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ boardSizeFt: ft }),
                        });
                      } catch { /* 실패해도 무시 */ }
                    }}
                    className="px-3 py-2 bg-primary text-primary-foreground text-xs rounded-lg font-medium"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 알림 설정 토글 - userInfo.notificationsEnabled와 연동 */}
          <div className="flex items-center justify-between p-4">
            <div>
              <span>알림 설정</span>
              {/* 현재 상태를 작은 텍스트로 표시 */}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {userInfo?.notificationsEnabled !== false ? '서핑 컨디션 알림을 받고 있어요' : '알림이 꺼져 있어요'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              {/* checked: userInfo의 실제 알림 설정 값 반영 (기본값 true) */}
              <input
                type="checkbox"
                className="sr-only peer"
                checked={userInfo?.notificationsEnabled !== false}
                onChange={(e) => onNotificationToggle(e.target.checked)}
              />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* 앱 정보 */}
          <button className="w-full text-left p-4 hover:bg-secondary transition-colors flex items-center justify-between">
            <span>앱 정보</span>
            <span className="text-sm text-muted-foreground">v1.4.2</span>
          </button>

          {/* 관리자 패널 진입 버튼 — role=ADMIN인 계정에만 표시 */}
          {userInfo?.role === 'ADMIN' && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-medium">관리자 패널</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {/* 로그아웃 버튼 */}
          <button
            onClick={onLogout}
            className="w-full text-left p-4 hover:bg-secondary transition-colors text-destructive"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
