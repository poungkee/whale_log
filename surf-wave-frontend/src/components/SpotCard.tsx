/**
 * @file SpotCard.tsx
 * @description 스팟 예보 카드 컴포넌트 - 디자인 v3 (웨이브 그라디언트)
 *
 * 디자인 특징:
 * - 카드 오른쪽에 파도 형태 그라디언트 배경 (점수별 색상 변화)
 * - PASS/WARNING/BLOCKED 안전 배지
 * - surfRating 0~10 + 등급 텍스트
 * - 파고/주기/풍속/조석 아이콘 한줄 요약
 * - 클릭 시 상세 모달 열림
 */

import { Waves, Wind, Clock, ArrowDown, ArrowUp } from 'lucide-react';
import type { SpotForecast, LevelFitResult, SurfLevel } from '../types';

interface SpotCardProps {
  /** 스팟별 예보 데이터 */
  data: SpotForecast;
  /** 현재 사용자 레벨 */
  currentLevel: SurfLevel;
  /** 카드 클릭 핸들러 */
  onClick?: () => void;
}

/** surfRating(0~10) 기준 등급 텍스트 */
function getRatingGrade(rating: number): string {
  if (rating >= 8) return 'EPIC';
  if (rating >= 6) return 'GREAT';
  if (rating >= 4) return 'GOOD';
  if (rating >= 2) return 'FAIR';
  return 'POOR';
}

/** surfRating(0~10) 기준 색상 반환 */
function getRatingColor(rating: number): string {
  if (rating >= 8) return '#32CD32';
  if (rating >= 6) return '#00BCD4';
  if (rating >= 4) return '#008CBA';
  if (rating >= 2) return '#FF8C00';
  return '#FF4444';
}

/** surfRating 기준 그라디언트 색상 (카드 웨이브 배경용) */
function getWaveGradient(rating: number): string {
  if (rating >= 7) return 'from-[#00BCD4]/30 via-[#008CBA]/15 to-transparent';
  if (rating >= 4) return 'from-[#008CBA]/20 via-[#0D1B2A]/10 to-transparent';
  return 'from-[#FF8C00]/10 via-[#0D1B2A]/5 to-transparent';
}

/** levelFit 결과에 따른 배지 스타일 */
function getLevelFitBadge(fit: LevelFitResult): { bg: string; text: string; label: string } {
  switch (fit) {
    case 'PASS':
      return { bg: 'bg-[#32CD32]/20', text: 'text-[#32CD32]', label: 'PASS' };
    case 'WARNING':
      return { bg: 'bg-[#FF8C00]/20', text: 'text-[#FF8C00]', label: 'WARNING' };
    case 'BLOCKED':
      return { bg: 'bg-[#FF4444]/20', text: 'text-[#FF4444]', label: 'BLOCKED' };
  }
}

/** 난이도 한국어 약칭 */
function getDifficultyShort(difficulty: string): string {
  const d = difficulty?.toUpperCase() || '';
  if (d === 'BEGINNER') return '초급';
  if (d === 'INTERMEDIATE') return '중급';
  if (d === 'ADVANCED') return '상급';
  if (d === 'EXPERT') return '전문가';
  return difficulty;
}

/** 조석 상태 한국어 + 방향 */
function getTideLabel(status: string | null): { label: string; rising: boolean } {
  switch (status) {
    case 'RISING': return { label: '밀물', rising: true };
    case 'FALLING': return { label: '썰물', rising: false };
    case 'HIGH': return { label: '만조', rising: true };
    case 'LOW': return { label: '간조', rising: false };
    default: return { label: '', rising: false };
  }
}

export function SpotCard({ data, currentLevel, onClick }: SpotCardProps) {
  const { spot, forecast, surfRating, levelFit, recommendationKo } = data;

  /** 현재 레벨의 적합도 판정 */
  const fitResult = levelFit?.[currentLevel] || 'PASS';
  const fitBadge = getLevelFitBadge(fitResult);

  /** 예보 데이터 없음 - 간소화 카드 */
  if (!forecast) {
    return (
      <div
        onClick={onClick}
        className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary/50 transition-colors"
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-sm">{spot.name}</h3>
            <span className="text-xs text-muted-foreground">{spot.region} {getDifficultyShort(spot.difficulty)}</span>
          </div>
          <span className="text-xs text-muted-foreground">데이터 없음</span>
        </div>
      </div>
    );
  }

  const ratingColor = getRatingColor(surfRating);
  const ratingGrade = getRatingGrade(surfRating);
  const waveGradient = getWaveGradient(surfRating);
  const tideInfo = getTideLabel(forecast.tideStatus);

  return (
    <div
      onClick={onClick}
      className="relative bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:border-primary/40 transition-all active:scale-[0.99]"
    >
      {/* 웨이브 그라디언트 배경 - 카드 오른쪽에서 왼쪽으로 */}
      <div className={`absolute inset-0 bg-gradient-to-l ${waveGradient} pointer-events-none`} />
      {/* SVG 파도 곡선 장식 */}
      <svg
        className="absolute right-0 top-0 h-full w-1/3 pointer-events-none opacity-20"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M100,0 L100,100 L60,100 C70,80 50,70 60,50 C70,30 50,20 60,0 Z"
          fill={ratingColor}
        />
      </svg>

      <div className="relative p-4">
        {/* 상단: 안전배지 + 스팟명 + 점수 */}
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex-1 min-w-0">
            {/* PASS/WARNING 배지 + 스팟 이름 */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${fitBadge.bg} ${fitBadge.text}`}>
                {fitBadge.label}
              </span>
              <h3 className="font-bold text-sm truncate">{spot.name}</h3>
            </div>
            {/* 지역 + 난이도 */}
            <p className="text-[11px] text-muted-foreground pl-0.5">
              {spot.region} · {getDifficultyShort(spot.difficulty)}
            </p>
          </div>
          {/* surfRating 점수 + 등급 */}
          <div className="text-right flex-shrink-0 ml-2">
            <span className="text-2xl font-black leading-none" style={{ color: ratingColor }}>
              {surfRating.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold ml-0.5" style={{ color: ratingColor }}>
              {ratingGrade}
            </span>
          </div>
        </div>

        {/* 한국어 추천 문구 */}
        <p className="text-xs text-muted-foreground mb-2.5 pl-0.5 leading-relaxed">
          {recommendationKo}
        </p>

        {/* 하단: 파고/주기/풍속/조석 아이콘 요약 */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {/* 파고 */}
          <div className="flex items-center gap-1">
            <Waves className="w-3 h-3 text-[#00BCD4]" />
            <span className="font-semibold">{Number(forecast.waveHeight).toFixed(1)}m</span>
          </div>
          {/* 주기 */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#008CBA]" />
            <span className="font-semibold">{Number(forecast.wavePeriod).toFixed(0)}s</span>
          </div>
          {/* 풍속 */}
          {forecast.windSpeed && (
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-[#FF8C00]" />
              <span className="font-semibold">{Number(forecast.windSpeed).toFixed(0)}km/h</span>
            </div>
          )}
          {/* 조석 */}
          {forecast.tideHeight && (
            <div className="flex items-center gap-1">
              {tideInfo.rising
                ? <ArrowUp className="w-3 h-3 text-[#32CD32]" />
                : <ArrowDown className="w-3 h-3 text-[#FF8C00]" />
              }
              <span className="font-semibold">{Number(forecast.tideHeight).toFixed(1)}m</span>
              <span className="text-muted-foreground">{tideInfo.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
