/**
 * @file SpotCard.tsx
 * @description 스팟 예보 카드 컴포넌트 - 각 서핑 스팟의 현재 컨디션 표시
 *
 * 실제 API 응답의 각 스팟 데이터 구조:
 * {
 *   "spot": { "id": "uuid", "name": "양양 서피비치", "region": "양양", "difficulty": "BEGINNER" },
 *   "forecast": { "waveHeight": "0.60", "wavePeriod": "7.5", "windSpeed": "17.60", ... },
 *   "surfRating": 5,
 *   "recommendationKo": "완벽한 서핑 컨디션이에요!",
 *   "simpleCondition": { "waveStatus": "적당", "windStatus": "보통", "overall": "좋음" }
 * }
 *
 * 표시 정보:
 * - 스팟 이름 (spot.name), 지역 (spot.region), 난이도 배지 (spot.difficulty)
 * - 서핑 적합도 (surfRating 1~5 + 이모지)
 * - 한국어 추천 문구 (recommendationKo)
 * - 파고(m), 파도 주기(s), 풍속(m/s)
 * - 간단 컨디션 상태 (simpleCondition.overall: 좋음/보통/주의)
 *
 * surfRating별 색상:
 * - 4~5: 녹색 (#32CD32) - 서핑 좋음
 * - 3: 파란색 (#008CBA) - 무난
 * - 2: 주황색 (#FF8C00) - 주의
 * - 1: 빨간색 (#FF4444) - 비추천
 *
 * forecast가 null이면 "데이터 없음" 간소화 카드 표시
 */

import { Wind, Waves } from 'lucide-react';
import type { SpotForecast } from '../types';

interface SpotCardProps {
  /** 스팟별 예보 데이터 - 대시보드 API 응답의 각 항목 */
  data: SpotForecast;
  /** 카드 클릭 핸들러 - 스팟 상세 화면으로 이동 (추후 구현) */
  onClick?: () => void;
}

/** surfRating에 따른 색상 반환 */
function getRatingColor(rating: number): string {
  if (rating >= 4) return '#32CD32';  // 좋음 - 녹색
  if (rating >= 3) return '#008CBA';  // 보통 - 파란색
  if (rating >= 2) return '#FF8C00';  // 주의 - 주황색
  return '#FF4444';                    // 비추 - 빨간색
}

/** surfRating에 따른 이모지 반환 */
function getRatingEmoji(rating: number): string {
  if (rating >= 4) return '🤙';  // 좋음
  if (rating >= 3) return '👍';  // 보통
  if (rating >= 2) return '🤔';  // 주의
  return '😴';                    // 비추
}

/** 난이도별 배지 스타일 (배경색 + 텍스트색) */
function getDifficultyStyle(difficulty: string): { bg: string; text: string } {
  const d = difficulty?.toUpperCase() || '';
  if (d === 'BEGINNER') return { bg: 'bg-[#32CD32]/20', text: 'text-[#32CD32]' };
  if (d === 'INTERMEDIATE') return { bg: 'bg-[#008CBA]/20', text: 'text-[#008CBA]' };
  if (d === 'ADVANCED') return { bg: 'bg-[#FF8C00]/20', text: 'text-[#FF8C00]' };
  return { bg: 'bg-[#FF4444]/20', text: 'text-[#FF4444]' };
}

/** 난이도별 한국어 라벨 */
function getDifficultyLabel(difficulty: string): string {
  const d = difficulty?.toUpperCase() || '';
  if (d === 'BEGINNER') return '초보자 적합';
  if (d === 'INTERMEDIATE') return '중급자 추천';
  if (d === 'ADVANCED') return '상급자 추천';
  if (d === 'EXPERT') return '전문가 전용';
  return difficulty;
}

export function SpotCard({ data, onClick }: SpotCardProps) {
  const { spot, forecast, surfRating, recommendationKo, simpleCondition } = data;
  const diffStyle = getDifficultyStyle(spot.difficulty);

  /** 예보 데이터 없음 - 간소화 카드 표시 */
  if (!forecast) {
    return (
      <div
        onClick={onClick}
        className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary transition-colors"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold mb-1">{spot.name}</h3>
            <span className={`text-xs px-3 py-1 rounded-full ${diffStyle.bg} ${diffStyle.text}`}>
              {getDifficultyLabel(spot.difficulty)}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">데이터 없음</span>
        </div>
      </div>
    );
  }

  const ratingColor = getRatingColor(surfRating);
  const ratingEmoji = getRatingEmoji(surfRating);

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:border-primary transition-all active:scale-[0.99]"
    >
      {/* surfRating 색상 바 - 카드 상단 */}
      <div className="h-1" style={{ backgroundColor: ratingColor }} />

      <div className="p-4">
        {/* 상단: 스팟 이름 + 난이도 배지 + surfRating 점수 */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">{spot.name}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${diffStyle.bg} ${diffStyle.text}`}>
                {getDifficultyLabel(spot.difficulty)}
              </span>
              {/* 지역 표시 */}
              {spot.region && (
                <span className="text-xs text-muted-foreground">{spot.region}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="text-2xl">{ratingEmoji}</span>
              <span className="text-2xl font-bold" style={{ color: ratingColor }}>
                {surfRating}
              </span>
            </div>
          </div>
        </div>

        {/* 한국어 추천 문구 */}
        {recommendationKo && (
          <div className="mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: `${ratingColor}15` }}>
            <p className="text-sm font-medium" style={{ color: ratingColor }}>
              {recommendationKo}
            </p>
          </div>
        )}

        {/* 하단: 파고 + 풍속 + 전체 컨디션 배지 */}
        <div className="flex gap-4 text-sm">
          {/* 파고 (m) + 파도 주기 (s) */}
          <div className="flex items-center gap-1.5">
            <Waves className="w-4 h-4 text-primary" />
            <span className="font-medium">{forecast.waveHeight}m</span>
            <span className="text-xs text-muted-foreground">{forecast.wavePeriod}s</span>
          </div>
          {/* 풍속 (m/s) - null이 아닌 경우만 표시 */}
          {forecast.windSpeed && (
            <div className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-accent" />
              <span className="font-medium">{forecast.windSpeed}m/s</span>
            </div>
          )}
          {/* 전체 컨디션 상태 배지 (좋음/보통/주의) */}
          {simpleCondition && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                simpleCondition.overall === '좋음' ? 'bg-[#32CD32]/20 text-[#32CD32]' :
                simpleCondition.overall === '보통' ? 'bg-[#008CBA]/20 text-[#008CBA]' :
                'bg-[#FF8C00]/20 text-[#FF8C00]'
              }`}>
                {simpleCondition.overall}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
