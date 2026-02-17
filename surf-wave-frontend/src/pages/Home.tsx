/**
 * @file Home.tsx
 * @description 메인 홈 화면 - Surfline 스타일 리디자인
 *
 * API 호출: GET /api/v1/dashboard/forecasts?level={surfLevel}
 *
 * 레이아웃 구조:
 * 1. Header (심플 - 타이틀 + 검색 + 새로고침)
 * 2. 오늘의 베스트 수평 캐러셀 (상위 3개, BLOCKED 제외)
 * 3. 탭 바: 전체 | 국내 | 발리
 * 4. 세부 칩: 동해/남해/제주/서해 (국내 선택 시)
 * 5. SpotCard 리스트
 */

import { useState, useEffect, useMemo } from 'react';
import { Star } from 'lucide-react';
import { getRatingGrade, getRatingColor } from '../lib/utils';
import type { SurfLevel, BoardType, SpotForecast, DashboardResponse, RegionFilter } from '../types';
import { SpotCard } from '../components/SpotCard';
import { SpotDetailModal } from '../components/SpotDetailModal';
import { Header, matchRegionFilter, DOMESTIC_GROUPS, BALI_GROUPS } from '../components/Header';

interface HomeProps {
  /** 사용자 서핑 레벨 - 대시보드 API 쿼리 파라미터로 사용 */
  surfLevel: SurfLevel;
  /** 보드 타입 - API에 전달하여 hints에 보드별 팁 포함 */
  boardType?: BoardType;
}

/** 한글 검색어 → 영문 매핑 (검색 시 한글로 발리 스팟 찾기 위해) */
const SEARCH_ALIASES: Record<string, string[]> = {
  '발리': ['bali'],
  '꾸따': ['kuta'],
  '쿠타': ['kuta'],
  '짱구': ['canggu'],
  '창구': ['canggu'],
  '사누르': ['sanur'],
  '짐바란': ['jimbaran'],
  '누사두아': ['nusa dua'],
  '울루와뚜': ['uluwatu', 'airport reef'],
  '부킷': ['bukit'],
  '렘봉안': ['lembongan'],
  '체닝안': ['lembongan'],
};

/** 대분류 탭 정의 */
const MAJOR_TABS: { key: '전체' | '국내' | '발리'; label: string }[] = [
  { key: '전체', label: '전체' },
  { key: '국내', label: '국내' },
  { key: '발리', label: '발리' },
];

export function Home({ surfLevel, boardType }: HomeProps) {
  /** 대시보드 API에서 받아온 스팟별 예보 데이터 목록 */
  const [spots, setSpots] = useState<SpotForecast[]>([]);
  /** 데이터 로딩 중 상태 */
  const [isLoading, setIsLoading] = useState(true);
  /** API 에러 메시지 */
  const [error, setError] = useState<string | null>(null);
  /** 마지막 데이터 갱신 시각 */
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  /** 상세 모달에 표시할 스팟 (null이면 모달 닫힘) */
  const [selectedSpot, setSelectedSpot] = useState<SpotForecast | null>(null);
  /** 현재 선택된 지역 필터 (2단계 구조) */
  const [regionFilter, setRegionFilter] = useState<RegionFilter>({ major: '전체', sub: null });
  /** 검색어 */
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * 대시보드 예보 데이터 조회
   * GET /api/v1/dashboard/forecasts?level={surfLevel}
   */
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const boardParam = boardType && boardType !== 'UNSET' ? `&boardType=${boardType}` : '';
      const res = await fetch(`/api/v1/dashboard/forecasts?level=${surfLevel}${boardParam}`);
      if (!res.ok) throw new Error('API error');
      const json: DashboardResponse = await res.json();
      /** surfRating 높은 순으로 정렬 */
      const sorted = (json.spots || []).sort((a, b) => (b.surfRating ?? 0) - (a.surfRating ?? 0));
      setSpots(sorted);
      setLastUpdated(new Date());
    } catch {
      setError('데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  /** surfLevel 또는 boardType이 변경될 때마다 새 데이터 조회 */
  useEffect(() => {
    fetchData();
  }, [surfLevel, boardType]);

  /**
   * 오늘의 베스트 스팟 (상위 3개)
   * BLOCKED 제외, surfRating 높은 순
   */
  const bestSpots = useMemo(() => {
    return spots
      .filter(s => {
        /** BLOCKED 스팟 제외 */
        const fit = s.levelFit?.[surfLevel];
        return fit !== 'BLOCKED' && s.forecast;
      })
      .slice(0, 3);
  }, [spots, surfLevel]);

  /** 현재 대분류에 맞는 세부 지역 칩 목록 */
  const subGroups = useMemo(() => {
    if (regionFilter.major === '국내') return DOMESTIC_GROUPS;
    if (regionFilter.major === '발리') return BALI_GROUPS;
    return [];
  }, [regionFilter.major]);

  /** 필터 + 검색 적용된 스팟 목록 (메모이제이션) */
  const filteredSpots = useMemo(() => {
    let result = spots;

    /** 지역 필터 적용 */
    if (regionFilter.major !== '전체') {
      result = result.filter(s => matchRegionFilter(s.spot.region, regionFilter));
    }

    /** 검색어 필터 적용 - 스팟 이름, 지역, 한글 별칭 매칭 */
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      /** 한글 검색어에 대응하는 영문 키워드 목록 조회 */
      const aliasMatches: string[] = [];
      Object.entries(SEARCH_ALIASES).forEach(([ko, enList]) => {
        if (q.includes(ko)) aliasMatches.push(...enList);
      });

      result = result.filter(s => {
        const name = s.spot.name.toLowerCase();
        const region = s.spot.region.toLowerCase();
        /** 직접 매칭 (이름 또는 지역에 검색어 포함) */
        if (name.includes(q) || region.includes(q)) return true;
        /** 한글 별칭 매칭 (예: "발리" → "bali" 포함 여부) */
        if (aliasMatches.some(alias => name.includes(alias) || region.includes(alias))) return true;
        return false;
      });
    }

    return result;
  }, [spots, regionFilter, searchQuery]);

  /** 대분류 탭 변경 핸들러 */
  const handleMajorTabChange = (major: '전체' | '국내' | '발리') => {
    setRegionFilter({ major, sub: null });
  };

  /** 세부 지역 칩 선택 핸들러 */
  const handleSubChipChange = (subKey: string | null) => {
    setRegionFilter(prev => ({ ...prev, sub: subKey }));
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 상단 헤더 (심플화) */}
      <Header
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        lastUpdated={lastUpdated}
        onRefresh={fetchData}
        isLoading={isLoading}
      />

      <div className="max-w-md mx-auto px-4 py-4">
        {/* 에러 상태 표시 */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <button onClick={fetchData} className="text-sm text-primary hover:underline">
              다시 시도
            </button>
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {isLoading && spots.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="h-4 bg-secondary rounded w-20 mb-2" />
                    <div className="h-3 bg-secondary rounded w-16" />
                  </div>
                  <div className="h-10 bg-secondary rounded w-16" />
                </div>
                <div className="h-8 bg-secondary rounded w-20 mb-3" />
                <div className="flex gap-3">
                  <div className="h-4 bg-secondary rounded w-14" />
                  <div className="h-4 bg-secondary rounded w-10" />
                  <div className="h-4 bg-secondary rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 오늘의 베스트 캐러셀 - 상위 3개 스팟 */}
        {!isLoading && bestSpots.length > 0 && (
          <div className="mb-5">
            {/* 섹션 제목 */}
            <div className="flex items-center gap-1.5 mb-3">
              <Star className="w-4 h-4 text-[#F1C40F]" />
              <h2 className="text-sm font-bold">오늘의 베스트</h2>
            </div>
            {/* 수평 스크롤 캐러셀 */}
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
              {bestSpots.map((spotData) => {
                const color = getRatingColor(spotData.surfRating);
                const grade = getRatingGrade(spotData.surfRating);
                return (
                  <div
                    key={spotData.spot.id}
                    onClick={() => setSelectedSpot(spotData)}
                    className="min-w-[200px] flex-shrink-0 snap-start bg-card rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40 transition-all"
                  >
                    {/* 등급 dot + 등급 텍스트 */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-bold" style={{ color }}>{grade}</span>
                      <span className="text-xs font-black" style={{ color }}>{spotData.surfRating.toFixed(1)}</span>
                    </div>
                    {/* 파고 크게 */}
                    <div className="mb-1">
                      <span className="text-2xl font-black">
                        {spotData.forecast ? Number(spotData.forecast.waveHeight).toFixed(1) : '-'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-0.5">m</span>
                    </div>
                    {/* 스팟 이름 */}
                    <p className="text-xs font-semibold truncate">{spotData.spot.name}</p>
                    <p className="text-[10px] text-muted-foreground">{spotData.spot.region}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 대분류 탭 바: 전체 | 국내 | 발리 */}
        {!isLoading && spots.length > 0 && (
          <div className="mb-3">
            <div className="flex bg-secondary rounded-lg p-0.5">
              {MAJOR_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleMajorTabChange(tab.key)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    regionFilter.major === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 세부 지역 칩 (국내 또는 발리 선택 시) */}
        {!isLoading && subGroups.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {/* "전체" 칩 */}
            <button
              onClick={() => handleSubChipChange(null)}
              className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                regionFilter.sub === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              전체
            </button>
            {subGroups.map(group => {
              /** 해당 그룹에 속하는 스팟 수 계산 */
              const count = spots.filter(s => group.regions.includes(s.spot.region)).length;
              if (count === 0) return null;
              return (
                <button
                  key={group.key}
                  onClick={() => handleSubChipChange(group.key)}
                  className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    regionFilter.sub === group.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 스팟 카드 목록 - 필터/검색 적용된 결과 */}
        {filteredSpots.length > 0 && (
          <div className="space-y-3">
            {filteredSpots.map((spotData) => (
              <SpotCard
                key={spotData.spot.id}
                data={spotData}
                currentLevel={surfLevel}
                onClick={() => setSelectedSpot(spotData)}
              />
            ))}
          </div>
        )}

        {/* 필터 결과 없음 */}
        {!isLoading && spots.length > 0 && filteredSpots.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-base font-semibold mb-1">검색 결과가 없어요</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {searchQuery ? `"${searchQuery}"에 맞는 스팟이 없습니다` : '해당 지역에 스팟이 없습니다'}
            </p>
            <button
              onClick={() => { setRegionFilter({ major: '전체', sub: null }); setSearchQuery(''); }}
              className="text-sm text-primary hover:underline"
            >
              전체 보기
            </button>
          </div>
        )}

        {/* 빈 상태 - API에서 데이터 자체가 없을 때 */}
        {!isLoading && spots.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🌊</div>
            <h3 className="text-lg font-semibold mb-2">스팟 정보가 없어요</h3>
            <p className="text-sm text-muted-foreground">잠시 후 다시 시도해주세요</p>
          </div>
        )}
      </div>

      {/* 스팟 상세 모달 */}
      {selectedSpot && (
        <SpotDetailModal
          data={selectedSpot}
          currentLevel={surfLevel}
          onClose={() => setSelectedSpot(null)}
        />
      )}
    </div>
  );
}
