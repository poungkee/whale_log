/**
 * @file Home.tsx
 * @description 메인 홈 화면 - 대시보드 예보 데이터 표시
 *
 * API 호출: GET /api/v1/dashboard/forecasts?level={surfLevel}
 * - @Public() 엔드포인트 → JWT 토큰 불필요
 * - level 파라미터로 사용자 레벨에 맞는 스팟만 필터링
 *
 * 실제 API 응답 구조:
 * {
 *   "fetchedAt": "2026-02-09T08:48:49.842Z",
 *   "totalSpots": 8,
 *   "spots": [
 *     {
 *       "spot": { "id": "uuid", "name": "양양 서피비치", "region": "양양", "difficulty": "BEGINNER", ... },
 *       "forecast": { "waveHeight": "0.60", "wavePeriod": "7.5", "windSpeed": "17.60", ... },
 *       "surfRating": 5,
 *       "recommendationKo": "완벽한 서핑 컨디션이에요!",
 *       "simpleCondition": { "waveStatus": "적당", "windStatus": "보통", "overall": "좋음" }
 *     }
 *   ]
 * }
 *
 * 표시 내용:
 * - 헤더: 앱 로고 + 현재 레벨 모드 + 새로고침/검색 버튼
 * - 오늘의 추천: 가장 높은 surfRating을 가진 스팟 하이라이트
 * - 스팟 목록: 레벨별 필터링된 모든 스팟의 예보 카드
 * - 로딩/에러/빈 상태 처리
 *
 * 데이터 갱신: surfLevel이 변경될 때 자동으로 다시 호출
 */

import { useState, useEffect } from 'react';
import { Search, RefreshCw, MapPin } from 'lucide-react';
import type { SurfLevel, SpotForecast, DashboardResponse } from '../types';
import { SpotCard } from '../components/SpotCard';

interface HomeProps {
  /** 사용자 서핑 레벨 - 대시보드 API 쿼리 파라미터로 사용 */
  surfLevel: SurfLevel;
}

/** 레벨별 한국어 라벨 - 헤더에 "초급 모드" 등으로 표시 */
const LEVEL_LABELS: Record<SurfLevel, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '상급',
  EXPERT: '전문가',
};

export function Home({ surfLevel }: HomeProps) {
  /** 대시보드 API에서 받아온 스팟별 예보 데이터 목록 */
  const [spots, setSpots] = useState<SpotForecast[]>([]);
  /** 데이터 로딩 중 상태 - 스켈레톤 UI 표시에 사용 */
  const [isLoading, setIsLoading] = useState(true);
  /** API 에러 메시지 */
  const [error, setError] = useState<string | null>(null);
  /** 마지막 데이터 갱신 시각 - 화면에 "HH:MM 업데이트" 표시 */
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * 대시보드 예보 데이터 조회
   * GET /api/v1/dashboard/forecasts?level={surfLevel}
   *
   * 응답: DashboardResponse { fetchedAt, totalSpots, spots: SpotForecast[] }
   * spots 배열에서 각 항목은 spot(스팟정보) + forecast(예보) + surfRating + recommendationKo + simpleCondition
   */
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/dashboard/forecasts?level=${surfLevel}`);
      if (!res.ok) throw new Error('API error');
      /** API 응답: { fetchedAt, totalSpots, spots: [...] } */
      const json: DashboardResponse = await res.json();
      setSpots(json.spots || []);
      setLastUpdated(new Date());
    } catch {
      setError('데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  /** surfLevel이 변경될 때마다 새 데이터 조회 (레벨 변경 시 자동 갱신) */
  useEffect(() => {
    fetchData();
  }, [surfLevel]);

  /**
   * 오늘의 추천 스팟 - surfRating이 가장 높은 스팟을 하이라이트 표시
   * spots 배열에서 surfRating이 가장 높은 항목을 선택
   */
  const topSpot = spots.length > 0 ? spots.reduce((best, s) =>
    (s.surfRating ?? 0) > (best.surfRating ?? 0) ? s : best
  , spots[0]) : null;

  return (
    <div className="min-h-screen pb-20">
      {/* 상단 헤더 - 앱 로고 + 레벨 모드 + 새로고침/검색 */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center">
                <span className="text-lg">🏄</span>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">서핑 파도</h1>
                <span className="text-xs text-muted-foreground">{LEVEL_LABELS[surfLevel]} 모드</span>
              </div>
            </div>
            <div className="flex gap-2">
              {/* 새로고침 버튼 - 로딩 중이면 회전 애니메이션 */}
              <button
                onClick={fetchData}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-5">
        {/* 에러 상태 표시 */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <button
              onClick={fetchData}
              className="text-sm text-primary hover:underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 로딩 스켈레톤 - 데이터가 아직 없을 때 표시 */}
        {isLoading && spots.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="h-5 bg-secondary rounded w-32 mb-3" />
                <div className="h-4 bg-secondary rounded w-48 mb-2" />
                <div className="h-4 bg-secondary rounded w-24" />
              </div>
            ))}
          </div>
        )}

        {/* 오늘의 추천 - surfRating이 가장 높은 스팟 하이라이트 */}
        {topSpot && topSpot.forecast && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">오늘의 추천</h2>
            </div>
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl p-4 border border-primary/30">
              <div className="flex justify-between items-start mb-2">
                <div>
                  {/* 스팟 이름 + 한국어 추천 문구 */}
                  <h3 className="font-bold text-lg mb-1">{topSpot.spot.name}</h3>
                  <p className="text-sm" style={{
                    color: topSpot.surfRating >= 4 ? '#32CD32' :
                           topSpot.surfRating >= 3 ? '#008CBA' : '#FF8C00'
                  }}>
                    {topSpot.recommendationKo}
                  </p>
                </div>
                <div className="text-right">
                  {/* 파고 + 파도 주기 */}
                  <div className="text-3xl font-bold text-primary">
                    {topSpot.forecast.waveHeight}m
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {topSpot.forecast.wavePeriod}s 주기
                  </div>
                </div>
              </div>
              {/* 간단 컨디션 배지 - 파도/바람 상태 */}
              {topSpot.simpleCondition && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                    파도 {topSpot.simpleCondition.waveStatus}
                  </span>
                  <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded-full">
                    바람 {topSpot.simpleCondition.windStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 스팟 목록 - 레벨별 필터링된 전체 스팟 카드 */}
        {spots.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              {/* 레벨에 따라 목록 제목 변경 */}
              <h2 className="text-lg font-bold">
                {surfLevel === 'BEGINNER' ? '초보자 추천 스팟' :
                 surfLevel === 'INTERMEDIATE' ? '추천 스팟' :
                 '전체 스팟'}
              </h2>
              {/* 마지막 업데이트 시각 표시 */}
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
                </span>
              )}
            </div>
            <div className="space-y-3">
              {spots.map((spotData) => (
                <SpotCard key={spotData.spot.id} data={spotData} />
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 - 스팟 데이터가 없을 때 */}
        {!isLoading && spots.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🌊</div>
            <h3 className="text-lg font-semibold mb-2">스팟 정보가 없어요</h3>
            <p className="text-sm text-muted-foreground">
              잠시 후 다시 시도해주세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
