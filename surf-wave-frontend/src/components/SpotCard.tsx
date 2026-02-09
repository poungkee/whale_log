import { Wind, Waves, Clock } from 'lucide-react';
import type { SpotForecast } from '../types';

interface SpotCardProps {
  data: SpotForecast;
  onClick?: () => void;
}

function getRatingColor(rating: number): string {
  if (rating >= 4) return '#32CD32';
  if (rating >= 3) return '#008CBA';
  if (rating >= 2) return '#FF8C00';
  return '#FF4444';
}

function getRatingEmoji(rating: number): string {
  if (rating >= 4) return '🤙';
  if (rating >= 3) return '👍';
  if (rating >= 2) return '🤔';
  return '😴';
}

function getDifficultyStyle(difficulty: string): { bg: string; text: string } {
  const d = difficulty?.toUpperCase() || '';
  if (d === 'BEGINNER') return { bg: 'bg-[#32CD32]/20', text: 'text-[#32CD32]' };
  if (d === 'INTERMEDIATE') return { bg: 'bg-[#008CBA]/20', text: 'text-[#008CBA]' };
  if (d === 'ADVANCED') return { bg: 'bg-[#FF8C00]/20', text: 'text-[#FF8C00]' };
  return { bg: 'bg-[#FF4444]/20', text: 'text-[#FF4444]' };
}

function getDifficultyLabel(difficulty: string): string {
  const d = difficulty?.toUpperCase() || '';
  if (d === 'BEGINNER') return '초보자 적합';
  if (d === 'INTERMEDIATE') return '중급자 추천';
  if (d === 'ADVANCED') return '상급자 추천';
  if (d === 'EXPERT') return '전문가 전용';
  return difficulty;
}

export function SpotCard({ data, onClick }: SpotCardProps) {
  const forecast = data.forecast;
  const diffStyle = getDifficultyStyle(data.difficulty);

  if (!forecast) {
    return (
      <div
        onClick={onClick}
        className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary transition-colors"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold mb-1">{data.spotName}</h3>
            <span className={`text-xs px-3 py-1 rounded-full ${diffStyle.bg} ${diffStyle.text}`}>
              {getDifficultyLabel(data.difficulty)}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">데이터 없음</span>
        </div>
      </div>
    );
  }

  const ratingColor = getRatingColor(forecast.rating);
  const ratingEmoji = getRatingEmoji(forecast.rating);

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:border-primary transition-all active:scale-[0.99]"
    >
      {/* Rating bar */}
      <div className="h-1" style={{ backgroundColor: ratingColor }} />

      <div className="p-4">
        {/* Top row: name + rating */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">{data.spotName}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${diffStyle.bg} ${diffStyle.text}`}>
                {getDifficultyLabel(data.difficulty)}
              </span>
              {data.region && (
                <span className="text-xs text-muted-foreground">{data.region}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-2xl">{ratingEmoji}</span>
              <span className="text-2xl font-bold" style={{ color: ratingColor }}>
                {forecast.rating}
              </span>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {forecast.recommendationKo && (
          <div className="mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${ratingColor}15` }}>
            <p className="text-sm font-medium" style={{ color: ratingColor }}>
              {forecast.recommendationKo}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Waves className="w-4 h-4 text-primary" />
            <span className="font-medium">{forecast.waveHeight}m</span>
            <span className="text-xs text-muted-foreground">{forecast.wavePeriod}s</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-accent" />
            <span className="font-medium">{forecast.windSpeed}m/s</span>
          </div>
          {forecast.simpleCondition && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                forecast.simpleCondition.overall === '좋음' ? 'bg-[#32CD32]/20 text-[#32CD32]' :
                forecast.simpleCondition.overall === '보통' ? 'bg-[#008CBA]/20 text-[#008CBA]' :
                'bg-[#FF8C00]/20 text-[#FF8C00]'
              }`}>
                {forecast.simpleCondition.overall}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
