/**
 * @file Header.tsx
 * @description 메인 화면 상단 헤더 컴포넌트
 *
 * 포함 기능:
 * - 타이틀 + 레벨 배지
 * - 검색 토글 + 검색 입력창
 * - 2단계 드롭다운 지역 필터 (전체/국내/발리 → 세부 지역)
 * - 업데이트 시각 표시
 */

import { useState, useRef, useEffect } from 'react';
import { RefreshCw, Search, X, ChevronDown } from 'lucide-react';
import type { SurfLevel, SpotForecast, RegionFilter, RegionGroup } from '../types';

/** 레벨 한국어 라벨 */
const LEVEL_KO: Record<SurfLevel, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '상급',
  EXPERT: '전문가',
};

/**
 * 국내 세부 지역 그룹 정의
 * key: 필터 식별자, label: 화면 표시명, regions: DB region 값 목록
 */
export const DOMESTIC_GROUPS: RegionGroup[] = [
  { key: '동해', label: '동해', regions: ['양양', '고성', '속초', '강릉'] },
  { key: '남해', label: '남해', regions: ['부산'] },
  { key: '제주', label: '제주', regions: ['제주'] },
  { key: '서해', label: '서해', regions: ['태안'] },
  { key: '기타', label: '기타', regions: ['포항', '고흥'] },
];

/**
 * 발리 세부 지역 그룹 정의
 * DB의 "Bali - Bukit" 등 region 값과 매핑
 */
export const BALI_GROUPS: RegionGroup[] = [
  { key: 'bukit', label: '부킷/울루와뚜', regions: ['Bali - Bukit'] },
  { key: 'canggu', label: '짱구', regions: ['Bali - Canggu'] },
  { key: 'kuta', label: '꾸따/레기안', regions: ['Bali - Kuta'] },
  { key: 'sanur', label: '사누르/스랑안', regions: ['Bali - Sanur'] },
  { key: 'nusadua', label: '누사두아', regions: ['Bali - Nusa Dua'] },
  { key: 'airport', label: '에어포트 리프', regions: ['Bali - Airport Reef'] },
  { key: 'jimbaran', label: '짐바란', regions: ['Bali - Jimbaran'] },
  { key: 'east', label: '동부 해안', regions: ['Bali - East Coast'] },
  { key: 'west', label: '서부 해안', regions: ['Bali - West Coast'] },
  { key: 'south', label: '남부 해안', regions: ['Bali - South Coast'] },
  { key: 'lembongan', label: '렘봉안/체닝안', regions: ['Bali - Lembongan'] },
];

/** 모든 국내 지역 region 값 통합 (국내 전체 필터용) */
const ALL_DOMESTIC_REGIONS = DOMESTIC_GROUPS.flatMap(g => g.regions);

/**
 * RegionFilter 조건으로 스팟 매칭 여부 판별
 * Home.tsx의 filteredSpots에서 사용
 */
export function matchRegionFilter(spotRegion: string, filter: RegionFilter): boolean {
  const { major, sub } = filter;

  /** 전체 선택 → 모든 스팟 표시 */
  if (major === '전체') return true;

  /** 국내 필터 */
  if (major === '국내') {
    if (!sub) {
      /** 국내 전체 → Bali 아닌 모든 지역 */
      return !spotRegion.startsWith('Bali');
    }
    /** 세부 지역 매칭 */
    const group = DOMESTIC_GROUPS.find(g => g.key === sub);
    return group ? group.regions.includes(spotRegion) : false;
  }

  /** 발리 필터 */
  if (major === '발리') {
    if (!sub) {
      /** 발리 전체 → Bali로 시작하는 모든 지역 */
      return spotRegion.startsWith('Bali');
    }
    /** 세부 지역 매칭 */
    const group = BALI_GROUPS.find(g => g.key === sub);
    return group ? group.regions.includes(spotRegion) : false;
  }

  return true;
}

/** 현재 필터 상태를 화면에 표시할 텍스트로 변환 */
function getFilterLabel(filter: RegionFilter): string {
  if (filter.major === '전체') return '전체';

  /** 세부 지역 선택된 경우 */
  if (filter.sub) {
    const groups = filter.major === '국내' ? DOMESTIC_GROUPS : BALI_GROUPS;
    const group = groups.find(g => g.key === filter.sub);
    return group ? `${filter.major} > ${group.label}` : filter.major;
  }

  /** 대분류만 선택된 경우 */
  return `${filter.major} 전체`;
}

interface HeaderProps {
  /** 사용자 서핑 레벨 */
  surfLevel: SurfLevel;
  /** 현재 선택된 지역 필터 */
  regionFilter: RegionFilter;
  /** 지역 필터 변경 핸들러 */
  onRegionFilterChange: (filter: RegionFilter) => void;
  /** 검색어 */
  searchQuery: string;
  /** 검색어 변경 핸들러 */
  onSearchQueryChange: (query: string) => void;
  /** 전체 스팟 목록 (카운트 계산용) */
  spots: SpotForecast[];
  /** 필터+검색 적용 후 스팟 수 */
  filteredCount: number;
  /** 마지막 업데이트 시각 */
  lastUpdated: Date | null;
  /** 새로고침 핸들러 */
  onRefresh: () => void;
  /** 로딩 상태 */
  isLoading: boolean;
}

export function Header({
  surfLevel,
  regionFilter,
  onRegionFilterChange,
  searchQuery,
  onSearchQueryChange,
  spots,
  filteredCount,
  lastUpdated,
  onRefresh,
  isLoading,
}: HeaderProps) {
  /** 검색창 열림/닫힘 */
  const [showSearch, setShowSearch] = useState(false);
  /** 드롭다운 열림/닫힘 */
  const [isOpen, setIsOpen] = useState(false);
  /** 드롭다운 ref (바깥 클릭 감지용) */
  const dropdownRef = useRef<HTMLDivElement>(null);

  /** 드롭다운 바깥 클릭 시 닫기 */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  /** 스팟 수 계산 - 대분류별 */
  const totalCount = spots.length;
  const domesticCount = spots.filter(s => !s.spot.region.startsWith('Bali')).length;
  const baliCount = spots.filter(s => s.spot.region.startsWith('Bali')).length;

  /** 세부 지역별 스팟 수 계산 */
  function getGroupCount(group: RegionGroup): number {
    return spots.filter(s => group.regions.includes(s.spot.region)).length;
  }

  /** 필터 선택 핸들러 - 선택 후 드롭다운 닫기 */
  function selectFilter(filter: RegionFilter) {
    onRegionFilterChange(filter);
    setIsOpen(false);
  }

  /** 선택된 필터인지 확인 */
  function isSelected(major: string, sub: string | null): boolean {
    return regionFilter.major === major && regionFilter.sub === sub;
  }

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4 py-3">
        {/* 첫 줄: 타이틀 + 레벨 배지 + 버튼 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">서핑 스팟</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary">
              {LEVEL_KO[surfLevel]}
            </span>
          </div>
          <div className="flex gap-1">
            {/* 검색 토글 버튼 */}
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) onSearchQueryChange(''); }}
              className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-primary/20 text-primary' : 'hover:bg-secondary'}`}
            >
              <Search className="w-4 h-4" />
            </button>
            {/* 새로고침 버튼 */}
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 검색 입력창 - 토글 시 표시 */}
        {showSearch && (
          <div className="mt-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="스팟 이름으로 검색..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-secondary rounded-lg border border-border focus:border-primary focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => onSearchQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-border rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* 지역 필터 드롭다운 */}
        <div className="mt-2 relative" ref={dropdownRef}>
          {/* 드롭다운 트리거 버튼 */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <span>{getFilterLabel(regionFilter)}</span>
            <span className="text-xs text-muted-foreground">({filteredCount})</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* 드롭다운 메뉴 */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="max-h-80 overflow-y-auto py-1">
                {/* === 전체 === */}
                <button
                  onClick={() => selectFilter({ major: '전체', sub: null })}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary/60 transition-colors flex justify-between items-center ${
                    isSelected('전체', null) ? 'bg-primary/10 text-primary font-semibold' : ''
                  }`}
                >
                  <span>전체</span>
                  <span className="text-xs text-muted-foreground">{totalCount}</span>
                </button>

                {/* === 구분선 === */}
                <div className="border-t border-border my-1" />

                {/* === 국내 대분류 === */}
                <button
                  onClick={() => selectFilter({ major: '국내', sub: null })}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary/60 transition-colors flex justify-between items-center font-medium ${
                    isSelected('국내', null) ? 'bg-primary/10 text-primary font-semibold' : ''
                  }`}
                >
                  <span>🇰🇷 국내 전체</span>
                  <span className="text-xs text-muted-foreground">{domesticCount}</span>
                </button>

                {/* 국내 세부 지역 */}
                {DOMESTIC_GROUPS.map(group => {
                  const count = getGroupCount(group);
                  if (count === 0) return null;
                  return (
                    <button
                      key={group.key}
                      onClick={() => selectFilter({ major: '국내', sub: group.key })}
                      className={`w-full text-left pl-8 pr-4 py-1.5 text-sm hover:bg-secondary/60 transition-colors flex justify-between items-center ${
                        isSelected('국내', group.key) ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      <span>{group.label}</span>
                      <span className="text-xs">{count}</span>
                    </button>
                  );
                })}

                {/* === 구분선 === */}
                <div className="border-t border-border my-1" />

                {/* === 발리 대분류 === */}
                <button
                  onClick={() => selectFilter({ major: '발리', sub: null })}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary/60 transition-colors flex justify-between items-center font-medium ${
                    isSelected('발리', null) ? 'bg-primary/10 text-primary font-semibold' : ''
                  }`}
                >
                  <span>🇮🇩 발리 전체</span>
                  <span className="text-xs text-muted-foreground">{baliCount}</span>
                </button>

                {/* 발리 세부 지역 */}
                {BALI_GROUPS.map(group => {
                  const count = getGroupCount(group);
                  if (count === 0) return null;
                  return (
                    <button
                      key={group.key}
                      onClick={() => selectFilter({ major: '발리', sub: group.key })}
                      className={`w-full text-left pl-8 pr-4 py-1.5 text-sm hover:bg-secondary/60 transition-colors flex justify-between items-center ${
                        isSelected('발리', group.key) ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      <span>{group.label}</span>
                      <span className="text-xs">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 업데이트 시각 */}
        {lastUpdated && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
            {' · '}{filteredCount}개 스팟
          </p>
        )}
      </div>
    </header>
  );
}
