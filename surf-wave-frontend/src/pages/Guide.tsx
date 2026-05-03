/**
 * @file Guide.tsx
 * @description 서핑 가이드 페이지 — DB에서 동적 조회 (Round 3 변환)
 *
 * 변경 (Round 3):
 *   - 기존 5개 하드코딩 const 배열(RULES_ITEMS 등) 모두 삭제
 *   - GET /api/v1/guides 호출하여 DB의 가이드 동적 조회
 *   - 운영자가 AdminGuides에서 추가/수정/삭제 시 즉시 반영
 *
 * 카테고리 매핑 (DB enum → frontend 카테고리):
 *   ETIQUETTE → rules    (바다 규칙/에티켓)
 *   SAFETY    → safety   (안전 상식)
 *   BEGINNER  → terms    (용어 사전)
 *   TECHNIQUE → basics   (기본 자세)
 *   EQUIPMENT → gear     (장비 가이드)
 *   WEATHER   → basics   (날씨 — 기본 자세에 포함)
 */

import { useState, useEffect } from 'react';
import {
  Shield, BookOpen, Footprints, Wrench,
  ChevronDown, ChevronUp, Users, Heart, Loader2,
} from 'lucide-react';
import { api } from '../lib/api';

/** 가이드 카테고리 타입 — 5개 카테고리 (frontend UI 라벨) */
type GuideCategory = 'rules' | 'safety' | 'terms' | 'basics' | 'gear';

/** 카테고리 정의 — 아이콘, 라벨, 색상, 설명 */
const CATEGORIES: {
  id: GuideCategory;
  icon: typeof Shield;
  label: string;
  desc: string;
  color: string;
}[] = [
  { id: 'rules',  icon: Users,       label: '바다 규칙', desc: '서핑 에티켓과 우선권',     color: '#3B82F6' },
  { id: 'safety', icon: Shield,      label: '안전 상식', desc: '위험 상황 대처법',         color: '#EF4444' },
  { id: 'terms',  icon: BookOpen,    label: '용어 사전', desc: '파도·바람·보드 용어',      color: '#22C55E' },
  { id: 'basics', icon: Footprints,  label: '기본 자세', desc: '스탠스·팝업·패들링',       color: '#F59E0B' },
  { id: 'gear',   icon: Wrench,      label: '장비 가이드', desc: '보드·웻슈트·왁스 선택', color: '#8B5CF6' },
];

/** DB 카테고리 → frontend 카테고리 매핑 */
const DB_TO_FRONTEND_CATEGORY: Record<string, GuideCategory> = {
  ETIQUETTE: 'rules',
  SAFETY:    'safety',
  BEGINNER:  'terms',
  TECHNIQUE: 'basics',
  EQUIPMENT: 'gear',
  WEATHER:   'basics', // 날씨는 기본 자세 카테고리로 분류
};

/** 카테고리별 기본 이모지 (DB에는 icon 컬럼 없음 → 카테고리로 대체) */
const CATEGORY_EMOJI: Record<GuideCategory, string> = {
  rules:  '🌊',
  safety: '⚠️',
  terms:  '📖',
  basics: '🏄',
  gear:   '🛹',
};

/** DB 가이드 응답 타입 (GET /api/v1/guides) */
interface DbGuide {
  id: string;
  title: string;
  content: string;
  category: string; // 백엔드 enum: BEGINNER/TECHNIQUE/SAFETY/EQUIPMENT/ETIQUETTE/WEATHER
  thumbnailUrl: string | null;
  sortOrder: number;
  estimatedReadMinutes: number;
  isPublished: boolean;
  isCompleted?: boolean;
}

/** 화면에 표시되는 가이드 항목 (정렬 후 카테고리 그룹핑된 형태) */
interface GuideItem {
  id: string;
  title: string;
  icon: string;
  content: string;
}

export function Guide() {
  /** 현재 선택된 카테고리 */
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('rules');
  /** 펼쳐진 아코디언 인덱스 (null이면 모두 접힘) */
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  /** DB에서 조회한 가이드 데이터 — 카테고리별 그룹핑 */
  const [guideData, setGuideData] = useState<Record<GuideCategory, GuideItem[]>>({
    rules: [], safety: [], terms: [], basics: [], gear: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** API 조회 — 마운트 시 1회 */
  useEffect(() => {
    const fetchGuides = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(api('/api/v1/guides?limit=200'), {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          setError('가이드를 불러올 수 없어요');
          return;
        }
        const data: DbGuide[] = await res.json();

        /** sortOrder 오름차순으로 정렬된 채로 카테고리 그룹핑 */
        const sorted = [...data].sort((a, b) => a.sortOrder - b.sortOrder);
        const grouped: Record<GuideCategory, GuideItem[]> = {
          rules: [], safety: [], terms: [], basics: [], gear: [],
        };
        for (const g of sorted) {
          const frontendCat = DB_TO_FRONTEND_CATEGORY[g.category];
          if (!frontendCat) continue;
          grouped[frontendCat].push({
            id: g.id,
            title: g.title,
            icon: CATEGORY_EMOJI[frontendCat],
            content: g.content,
          });
        }
        setGuideData(grouped);
      } catch {
        setError('서버 연결 실패');
      } finally {
        setLoading(false);
      }
    };
    fetchGuides();
  }, []);

  /** 아코디언 토글 */
  const toggleItem = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  };

  /** 카테고리 변경 시 아코디언 초기화 */
  const changeCategory = (cat: GuideCategory) => {
    setActiveCategory(cat);
    setExpandedIndex(null);
  };

  const items = guideData[activeCategory];
  const activeCat = CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div className="max-w-md mx-auto pb-24 px-4">
      {/* 헤더 */}
      <header className="py-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">서핑 가이드</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          초보 서퍼가 바다에 나가기 전에 꼭 알아야 할 것들
        </p>
      </header>

      {/* 카테고리 선택 — 5개 카테고리, 가로 스크롤 */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => changeCategory(cat.id)}
              className={`py-3 px-4 rounded-xl text-center border-2 transition-all shrink-0 min-w-[72px] ${
                isActive
                  ? 'scale-[1.02] shadow-md'
                  : 'border-border opacity-60 hover:opacity-80'
              }`}
              style={isActive ? {
                borderColor: cat.color,
                backgroundColor: `${cat.color}10`,
              } : {}}
            >
              <Icon
                className="w-5 h-5 mx-auto mb-1"
                style={isActive ? { color: cat.color } : {}}
              />
              <span
                className="text-[11px] font-bold block"
                style={isActive ? { color: cat.color } : {}}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 카테고리 설명 */}
      <div className="flex items-center gap-2 mb-3">
        <activeCat.icon className="w-4 h-4" style={{ color: activeCat.color }} />
        <h2 className="text-sm font-semibold">{activeCat.label}</h2>
        <span className="text-xs text-muted-foreground">— {activeCat.desc}</span>
        {!loading && (
          <span className="ml-auto text-xs text-muted-foreground">{items.length}개</span>
        )}
      </div>

      {/* 로딩 / 에러 / 빈 상태 / 가이드 목록 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          이 카테고리에 가이드가 없어요
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={item.id}
                className={`bg-card border rounded-xl overflow-hidden transition-all ${
                  isExpanded ? 'border-primary/30 shadow-md' : 'border-border'
                }`}
              >
                {/* 아코디언 헤더 — 클릭하면 펼침/접힘 */}
                <button
                  onClick={() => toggleItem(idx)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/50 transition-colors"
                >
                  {/* 아이콘 */}
                  <span className="text-lg shrink-0">{item.icon}</span>
                  {/* 제목 */}
                  <span className="flex-1 text-sm font-medium">{item.title}</span>
                  {/* 화살표 */}
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {/* 아코디언 내용 — 펼쳐졌을 때만 표시 */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="border-t border-border/50 pt-3">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {item.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 하단 안내 */}
      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="flex items-start gap-2">
          <Heart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary mb-1">안전한 서핑을 위해</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              처음엔 반드시 서핑 레슨을 받는 것을 추천해요. 이 가이드는 참고용이며, 실제 바다에서는 현장 상황에 따라 판단하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
