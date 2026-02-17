/**
 * @file Explore.tsx
 * @description 탐색(지도) 페이지 - 서핑 스팟을 지도에서 탐색
 *
 * 전체 화면 지도 위에 스팟 마커를 표시합니다.
 * 마커 클릭 시 팝업 → 상세 모달 흐름으로 연결됩니다.
 *
 * 데이터 소스: GET /api/v1/dashboard/forecasts?level={surfLevel}
 * (Home 페이지와 같은 API 사용)
 */

import { useState, useEffect } from 'react';
import type { SurfLevel, SpotForecast, DashboardResponse } from '../types';
import { SpotMap } from '../components/SpotMap';
import { SpotDetailModal } from '../components/SpotDetailModal';

interface ExploreProps {
  /** 사용자 서핑 레벨 - API 쿼리 파라미터 */
  surfLevel: SurfLevel;
}

export function Explore({ surfLevel }: ExploreProps) {
  /** 전체 스팟 예보 데이터 */
  const [spots, setSpots] = useState<SpotForecast[]>([]);
  /** API 로딩 상태 */
  const [loading, setLoading] = useState(true);
  /** 상세 모달에 표시할 스팟 */
  const [detailSpot, setDetailSpot] = useState<SpotForecast | null>(null);

  /** 대시보드 API에서 스팟 데이터 가져오기 */
  useEffect(() => {
    const fetchSpots = async () => {
      setLoading(true);
      try {
        /** 지도에서는 전체 스팟 표시 (레벨 필터 없음) */
        const res = await fetch(`/api/v1/dashboard/forecasts`);
        if (res.ok) {
          const data: DashboardResponse = await res.json();
          setSpots(data.spots);
        }
      } catch {
        console.error('스팟 데이터 로드 실패');
      } finally {
        setLoading(false);
      }
    };
    fetchSpots();
  }, [surfLevel]);

  return (
    <div className="h-[calc(100vh-4rem)] relative pb-0">
      {/* 상단 헤더 오버레이 */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="bg-gradient-to-b from-background/90 via-background/50 to-transparent px-4 pt-4 pb-10">
          <h1 className="text-lg font-bold drop-shadow-md">🗺️ 스팟 탐색</h1>
          <p className="text-xs text-muted-foreground drop-shadow-sm">
            {loading ? '로딩중...' : `${spots.length}개 스팟 · 마커를 눌러 상세 정보 확인`}
          </p>
        </div>
      </div>

      {/* 전체 화면 지도 */}
      {!loading && spots.length > 0 && (
        <SpotMap
          spots={spots}
          onSpotDetail={(sf) => setDetailSpot(sf)}
        />
      )}

      {/* 데이터 없음 */}
      {!loading && spots.length === 0 && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🌊</div>
            <h3 className="text-lg font-semibold mb-2">스팟 정보가 없어요</h3>
            <p className="text-sm text-muted-foreground">잠시 후 다시 시도해주세요</p>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">지도 로딩중...</p>
          </div>
        </div>
      )}

      {/* 스팟 상세 모달 */}
      {detailSpot && (
        <SpotDetailModal
          data={detailSpot}
          currentLevel={surfLevel}
          onClose={() => setDetailSpot(null)}
        />
      )}
    </div>
  );
}
