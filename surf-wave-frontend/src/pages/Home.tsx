/**
 * @file Home.tsx
 * @description 메인 홈 화면 - 대시보드 예보 데이터 표시 (디자인 v2)
 *
 * API 호출: GET /api/v1/dashboard/forecasts?level={surfLevel}
 *
 * 주요 기능:
 * - 2단계 드롭다운 지역 필터: 전체 / 국내(동해/남해/제주/서해/기타) / 발리(11개 세부 지역)
 * - 스팟 이름 검색
 * - surfRating 높은 순 정렬
 * - 카드 클릭 → 상세 모달
 */

import { useState, useEffect, useMemo } from 'react';
import type { SurfLevel, SpotForecast, DashboardResponse, RegionFilter } from '../types';
import { SpotCard } from '../components/SpotCard';
import { SpotDetailModal } from '../components/SpotDetailModal';
import { Header, matchRegionFilter } from '../components/Header';

interface HomeProps {
  /** 사용자 서핑 레벨 - 대시보드 API 쿼리 파라미터로 사용 */
  surfLevel: SurfLevel;
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

export function Home({ surfLevel }: HomeProps) {
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
      const res = await fetch(`/api/v1/dashboard/forecasts?level=${surfLevel}`);
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

  /** surfLevel이 변경될 때마다 새 데이터 조회 */
  useEffect(() => {
    fetchData();
  }, [surfLevel]);

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

  return (
    <div className="min-h-screen pb-20">
      {/* 상단 헤더 (분리된 컴포넌트) */}
      <Header
        surfLevel={surfLevel}
        regionFilter={regionFilter}
        onRegionFilterChange={setRegionFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        spots={spots}
        filteredCount={filteredSpots.length}
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
                    <div className="h-5 bg-secondary rounded w-32 mb-1" />
                    <div className="h-3 bg-secondary rounded w-16" />
                  </div>
                  <div className="h-10 bg-secondary rounded w-16" />
                </div>
                <div className="h-4 bg-secondary rounded w-48 mb-3" />
                <div className="flex gap-3">
                  <div className="h-4 bg-secondary rounded w-14" />
                  <div className="h-4 bg-secondary rounded w-10" />
                  <div className="h-4 bg-secondary rounded w-16" />
                </div>
              </div>
            ))}
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
