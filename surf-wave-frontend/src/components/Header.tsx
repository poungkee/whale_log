/**
 * @file Header.tsx
 * @description 메인 화면 상단 헤더 컴포넌트 - 심플화 버전
 *
 * 포함 기능:
 * - 타이틀 ("서핑 파도")
 * - 검색 토글 + 검색 입력창
 * - 새로고침 버튼
 * - 업데이트 시각 표시
 *
 * 지역 필터는 Home.tsx의 탭 바로 이동됨
 * matchRegionFilter, DOMESTIC_GROUPS, BALI_GROUPS는 export 유지 (Home에서 import)
 */

import { useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import type { RegionFilter, RegionGroup } from '../types';

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

interface HeaderProps {
  /** 검색어 */
  searchQuery: string;
  /** 검색어 변경 핸들러 */
  onSearchQueryChange: (query: string) => void;
  /** 마지막 업데이트 시각 */
  lastUpdated: Date | null;
  /** 새로고침 핸들러 */
  onRefresh: () => void;
  /** 로딩 상태 */
  isLoading: boolean;
}

export function Header({
  searchQuery,
  onSearchQueryChange,
  lastUpdated,
  onRefresh,
  isLoading,
}: HeaderProps) {
  /** 검색창 열림/닫힘 */
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-40">
      <div className="max-w-md mx-auto px-4 py-3">
        {/* 첫 줄: 타이틀 + 버튼 */}
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">서핑 파도</h1>
          <div className="flex items-center gap-1">
            {/* 업데이트 시각 */}
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground mr-2">
                {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
              </span>
            )}
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
      </div>
    </header>
  );
}
