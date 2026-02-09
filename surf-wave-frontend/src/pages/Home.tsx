import { useState, useEffect } from 'react';
import { Search, RefreshCw, MapPin } from 'lucide-react';
import type { SurfLevel, SpotForecast } from '../types';
import { SpotCard } from '../components/SpotCard';

interface HomeProps {
  surfLevel: SurfLevel;
}

const LEVEL_LABELS: Record<SurfLevel, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '상급',
  EXPERT: '전문가',
};

export function Home({ surfLevel }: HomeProps) {
  const [spots, setSpots] = useState<SpotForecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/dashboard/forecasts?level=${surfLevel}`);
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      setSpots(json.data || json);
      setLastUpdated(new Date());
    } catch {
      setError('데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [surfLevel]);

  const topSpot = spots.length > 0 ? spots.reduce((best, s) =>
    (s.forecast?.rating ?? 0) > (best.forecast?.rating ?? 0) ? s : best
  , spots[0]) : null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
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
        {/* Error State */}
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

        {/* Loading */}
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

        {/* Top Spot Highlight */}
        {topSpot && topSpot.forecast && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">오늘의 추천</h2>
            </div>
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl p-4 border border-primary/30">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg mb-1">{topSpot.spotName}</h3>
                  <p className="text-sm" style={{
                    color: topSpot.forecast.rating >= 4 ? '#32CD32' :
                           topSpot.forecast.rating >= 3 ? '#008CBA' : '#FF8C00'
                  }}>
                    {topSpot.forecast.recommendationKo}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {topSpot.forecast.waveHeight}m
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {topSpot.forecast.wavePeriod}s 주기
                  </div>
                </div>
              </div>
              {topSpot.forecast.simpleCondition && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                  <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                    파도 {topSpot.forecast.simpleCondition.waveStatus}
                  </span>
                  <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded-full">
                    바람 {topSpot.forecast.simpleCondition.windStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spot List */}
        {spots.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {surfLevel === 'BEGINNER' ? '초보자 추천 스팟' :
                 surfLevel === 'INTERMEDIATE' ? '추천 스팟' :
                 '전체 스팟'}
              </h2>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
                </span>
              )}
            </div>
            <div className="space-y-3">
              {spots.map((spot) => (
                <SpotCard key={spot.spotId} data={spot} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
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
