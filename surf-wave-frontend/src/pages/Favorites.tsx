/**
 * @file Favorites.tsx
 * @description 즐겨찾기 페이지 - 사용자가 즐겨찾기한 스팟의 예보를 보여주는 화면
 *
 * 동작 방식:
 * 1. GET /api/v1/spots/favorites (인증필요) → 즐겨찾기 스팟 ID 목록 가져오기
 * 2. GET /api/v1/dashboard/forecasts?level={surfLevel} → 전체 예보 데이터 가져오기
 * 3. 두 데이터를 교차매칭 → 즐겨찾기 스팟만 예보 카드로 표시
 *
 * 즐겨찾기 해제 시:
 * - DELETE /api/v1/spots/:spotId/favorite 호출
 * - 로컬 상태에서 즉시 제거 (낙관적 업데이트)
 */

import { useState, useEffect, useMemo } from 'react';
import { Heart, RefreshCw } from 'lucide-react';
import type { SurfLevel, BoardType, SpotForecast, DashboardResponse } from '../types';
import { SpotCard } from '../components/SpotCard';
import { SpotDetailModal } from '../components/SpotDetailModal';
import { api } from '../lib/api';

interface FavoritesProps {
  /** 사용자 서핑 레벨 - 대시보드 API 필터에 사용 */
  surfLevel: SurfLevel;
  /** 보드 타입 - 대시보드 API hints에 보드별 팁 포함 */
  boardType?: BoardType;
  /** 즐겨찾기 스팟 ID Set - App.tsx에서 전역 관리 */
  favoriteIds: Set<string>;
  /** 즐겨찾기 토글 핸들러 - App.tsx에서 API 호출 + 상태 업데이트 */
  onToggleFavorite: (spotId: string) => void;
}

export function Favorites({ surfLevel, boardType, favoriteIds, onToggleFavorite }: FavoritesProps) {
  /** 대시보드 예보 데이터 (전체 스팟) */
  const [allSpots, setAllSpots] = useState<SpotForecast[]>([]);
  /** 로딩 상태 */
  const [isLoading, setIsLoading] = useState(true);
  /** 에러 메시지 */
  const [error, setError] = useState<string | null>(null);
  /** 상세 모달에 표시할 스팟 */
  const [selectedSpot, setSelectedSpot] = useState<SpotForecast | null>(null);

  /**
   * 대시보드 예보 데이터 가져오기
   * 즐겨찾기 스팟의 예보 정보를 보여주기 위해 전체 대시보드 데이터를 사용
   */
  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const boardParam = boardType && boardType !== 'UNSET' ? `&boardType=${boardType}` : '';
      const res = await fetch(api(`/api/v1/dashboard/forecasts?level=${surfLevel}${boardParam}`));
      if (!res.ok) throw new Error('API error');
      const json: DashboardResponse = await res.json();
      setAllSpots(json.spots || []);
    } catch {
      setError('데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  /** surfLevel 또는 boardType 변경 시 예보 데이터 재조회 */
  useEffect(() => {
    fetchDashboard();
  }, [surfLevel, boardType]);

  /**
   * 즐겨찾기 스팟만 필터링 (대시보드 데이터에서)
   * surfRating 높은 순으로 정렬
   */
  const favoriteSpots = useMemo(() => {
    return allSpots
      .filter(s => favoriteIds.has(s.spot.id))
      .sort((a, b) => (b.surfRating ?? 0) - (a.surfRating ?? 0));
  }, [allSpots, favoriteIds]);

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 - 타이틀 + 새로고침 버튼 */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <h1 className="text-lg font-bold">즐겨찾기</h1>
            {/* 즐겨찾기 스팟 수 배지 */}
            {favoriteIds.size > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                {favoriteIds.size}
              </span>
            )}
          </div>
          {/* 새로고침 버튼 */}
          <button
            onClick={fetchDashboard}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* 에러 상태 */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <button onClick={fetchDashboard} className="text-sm text-primary hover:underline">
              다시 시도
            </button>
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {isLoading && allSpots.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 즐겨찾기 스팟 카드 목록 */}
        {!isLoading && favoriteSpots.length > 0 && (
          <div className="space-y-3">
            {favoriteSpots.map((spotData) => (
              <div key={spotData.spot.id} className="relative">
                {/* 즐겨찾기 해제 버튼 (카드 우측 하단) */}
                <SpotCard
                  data={spotData}
                  currentLevel={surfLevel}
                  onClick={() => setSelectedSpot(spotData)}
                  isFavorited={true}
                  onToggleFavorite={() => onToggleFavorite(spotData.spot.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 - 즐겨찾기가 없을 때 */}
        {!isLoading && favoriteIds.size === 0 && !error && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">
              <Heart className="w-16 h-16 mx-auto text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold mb-2">즐겨찾기가 비어있어요</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              홈 화면에서 스팟 카드의<br />
              하트 버튼을 눌러 추가해보세요
            </p>
          </div>
        )}

        {/* 즐겨찾기는 있는데 예보 데이터 매칭 안 될 때 */}
        {!isLoading && favoriteIds.size > 0 && favoriteSpots.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔄</div>
            <h3 className="text-lg font-semibold mb-2">예보 데이터 로딩 중</h3>
            <p className="text-sm text-muted-foreground">
              잠시 후 다시 시도해주세요
            </p>
            <button onClick={fetchDashboard} className="mt-3 text-sm text-primary hover:underline">
              새로고침
            </button>
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
