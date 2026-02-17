/**
 * @file SpotCard.tsx
 * @description 스팟 예보 카드 컴포넌트 - Surfline 스타일 플랫 디자인
 *
 * 디자인 특징:
 * - 색상 dot + 등급 텍스트 + 점수 + 안전 배지 (왼쪽 상단)
 * - 파고 3xl 크게 강조
 * - 주기/풍속/조석 한줄 요약
 * - 추천 문구
 * - BLOCKED 카드: opacity-50 grayscale 처리
 */

import { Wind, Clock, ArrowDown, ArrowUp, Sun, CloudRain, Cloud, Thermometer, Droplets } from 'lucide-react';
import { getRatingGrade, getRatingColor, getLevelFitColor, getLevelFitLabel } from '../lib/utils';
import type { SpotForecast, SurfLevel, HintTag } from '../types';

/** 날씨 상태 → lucide 아이콘 + 라벨 반환 */
function getWeatherIcon(condition: string | null): { icon: React.ReactNode; label: string } {
  if (!condition) return { icon: <Cloud className="w-3.5 h-3.5" />, label: '' };
  if (condition.includes('맑음')) return { icon: <Sun className="w-3.5 h-3.5 text-amber-400" />, label: condition };
  if (condition.includes('비') || condition.includes('소나기')) return { icon: <CloudRain className="w-3.5 h-3.5 text-blue-400" />, label: condition };
  return { icon: <Cloud className="w-3.5 h-3.5 text-gray-400" />, label: condition };
}

interface SpotCardProps {
  /** 스팟별 예보 데이터 */
  data: SpotForecast;
  /** 현재 사용자 레벨 */
  currentLevel: SurfLevel;
  /** 카드 클릭 핸들러 */
  onClick?: () => void;
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
  const { spot, forecast, surfRating, levelFit, recommendationKo, safetyReasons } = data;

  /** 현재 레벨의 적합도 판정 */
  const fitResult = levelFit?.[currentLevel] || 'PASS';
  /** BLOCKED 여부 - 카드 전체 dim 처리용 */
  const isBlocked = fitResult === 'BLOCKED';
  /** WARNING 여부 */
  const isWarning = fitResult === 'WARNING';

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
            <span className="text-xs text-muted-foreground">{spot.region} · {getDifficultyShort(spot.difficulty)}</span>
          </div>
          <span className="text-xs text-muted-foreground">데이터 없음</span>
        </div>
      </div>
    );
  }

  /** 신호등 색상 시스템 */
  const ratingColor = getRatingColor(surfRating);
  const ratingGrade = getRatingGrade(surfRating);
  const fitColor = getLevelFitColor(fitResult);
  const fitLabel = getLevelFitLabel(fitResult);
  const tideInfo = getTideLabel(forecast.tideStatus);

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary/40 transition-all active:scale-[0.99] ${
        isBlocked ? 'opacity-50 grayscale' : ''
      }`}
    >
      {/* 상단: 왼쪽(색상dot+등급+점수+안전배지) + 오른쪽(스팟명+지역) */}
      <div className="flex justify-between items-start mb-1">
        {/* 왼쪽: BLOCKED면 차단 사유, 아니면 점수+등급 표시 */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isBlocked ? (
            <>
              {/* BLOCKED: 빨간 차단 배지만 표시 (점수 숨김) */}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: '#E74C3C20', color: '#E74C3C' }}
              >
                차단
              </span>
              {/* 차단 사유 한줄 표시 */}
              <span className="text-[10px] text-[#E74C3C] truncate">
                {safetyReasons?.[0] || '서핑 불가'}
              </span>
            </>
          ) : (
            <>
              {/* 색상 dot - 등급 색상 표시 */}
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: ratingColor }}
              />
              {/* 등급 텍스트 */}
              <span className="text-xs font-bold" style={{ color: ratingColor }}>
                {ratingGrade}
              </span>
              {/* surfRating 점수 */}
              <span className="text-sm font-black" style={{ color: ratingColor }}>
                {surfRating.toFixed(1)}
              </span>
              {/* WARNING 배지 (주의 필요 시만 표시) */}
              {isWarning && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#F1C40F20', color: '#F1C40F' }}
                >
                  주의
                </span>
              )}
              {/* PASS일 때 안전 배지 */}
              {fitResult === 'PASS' && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${fitColor}20`, color: fitColor }}
                >
                  {fitLabel}
                </span>
              )}
            </>
          )}
        </div>
        {/* 오른쪽: 스팟 이름 + 지역 */}
        <div className="text-right flex-shrink-0">
          <h3 className="font-bold text-sm">{spot.name}</h3>
          <p className="text-[11px] text-muted-foreground">
            {spot.region} · {getDifficultyShort(spot.difficulty)}
          </p>
        </div>
      </div>

      {/* 파고 크게 강조 (3xl 폰트) */}
      <div className="my-2">
        <span className="text-3xl font-black leading-none">
          {Number(forecast.waveHeight).toFixed(1)}
        </span>
        <span className="text-sm font-medium text-muted-foreground ml-1">m</span>
      </div>

      {/* 주기 / 풍속 / 조석 한줄 요약 */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
        {/* 주기 */}
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span className="font-semibold text-foreground">{Number(forecast.wavePeriod).toFixed(0)}s</span>
        </div>
        {/* 풍속 */}
        {forecast.windSpeed && (
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3" />
            <span className="font-semibold text-foreground">{Number(forecast.windSpeed).toFixed(0)}km/h</span>
          </div>
        )}
        {/* 조석 */}
        {forecast.tideStatus && (
          <div className="flex items-center gap-1">
            {tideInfo.rising
              ? <ArrowUp className="w-3 h-3" />
              : <ArrowDown className="w-3 h-3" />
            }
            <span className="font-semibold text-foreground">{tideInfo.label}</span>
          </div>
        )}
      </div>

      {/* 날씨 / 기온 / 수온 구조화된 행 */}
      {(forecast.waterTemperature || forecast.airTemperature || forecast.weatherCondition) && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
          {/* 날씨 아이콘 + 상태 + 기온 */}
          {(forecast.weatherCondition || forecast.airTemperature != null) && (() => {
            const weather = getWeatherIcon(forecast.weatherCondition);
            return (
              <div className="flex items-center gap-1">
                {weather.icon}
                {weather.label && <span className="font-medium text-foreground">{weather.label}</span>}
                {forecast.airTemperature != null && (
                  <span className="font-semibold text-foreground">{Number(forecast.airTemperature).toFixed(0)}°C</span>
                )}
              </div>
            );
          })()}
          {/* 구분선 */}
          {forecast.waterTemperature != null && (forecast.weatherCondition || forecast.airTemperature != null) && (
            <span className="text-border">|</span>
          )}
          {/* 수온 */}
          {forecast.waterTemperature != null && (
            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-400" />
              <span className="text-muted-foreground">수온</span>
              <span className="font-semibold text-foreground">{Number(forecast.waterTemperature).toFixed(0)}°C</span>
            </div>
          )}
        </div>
      )}

      {/* C-7 hints 배지 - 점수 보조 설명 태그 */}
      {data.hints && data.hints.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {data.hints.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${getHintTagColor(tag)}18`,
                color: getHintTagColor(tag),
              }}
            >
              {getHintTagLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {/* hints 메시지 또는 기존 추천 문구 */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {data.hints?.message || recommendationKo}
      </p>
    </div>
  );
}

/** 힌트 태그별 색상 매핑 */
function getHintTagColor(tag: HintTag): string {
  switch (tag) {
    case 'SAFETY_WARNING': return '#E74C3C';
    case 'WAVE_TOO_BIG': return '#E74C3C';
    case 'WAVE_TOO_SMALL': return '#95A5A6';
    case 'STRONG_WIND': return '#E67E22';
    case 'ONSHORE_WIND': return '#E67E22';
    case 'OFFSHORE_WIND': return '#2ECC71';
    case 'GOOD_SWELL': return '#2ECC71';
    case 'BAD_SWELL': return '#F1C40F';
    case 'SHORT_PERIOD': return '#F1C40F';
    case 'LONG_PERIOD': return '#2ECC71';
    case 'LONGBOARD_TIP': return '#32CD32';
    case 'SHORTBOARD_TIP': return '#FF8C00';
    case 'GREAT_CONDITION': return '#9B59B6';
    default: return '#95A5A6';
  }
}

/** 힌트 태그별 한국어 라벨 매핑 */
function getHintTagLabel(tag: HintTag): string {
  switch (tag) {
    case 'SAFETY_WARNING': return '안전주의';
    case 'WAVE_TOO_BIG': return '높은파도';
    case 'WAVE_TOO_SMALL': return '잔잔';
    case 'STRONG_WIND': return '강풍';
    case 'ONSHORE_WIND': return '온쇼어';
    case 'OFFSHORE_WIND': return '오프쇼어';
    case 'GOOD_SWELL': return '좋은스웰';
    case 'BAD_SWELL': return '스웰불량';
    case 'SHORT_PERIOD': return '짧은주기';
    case 'LONG_PERIOD': return '긴주기';
    case 'LONGBOARD_TIP': return '롱보드';
    case 'SHORTBOARD_TIP': return '숏보드';
    case 'GREAT_CONDITION': return '최고';
    default: return tag;
  }
}
