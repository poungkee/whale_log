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

import { useState } from 'react';
import { Wind, Clock, ArrowDown, ArrowUp, Sun, CloudRain, Cloud, Droplets, Heart, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getRatingGrade, getRatingColor, getLevelFitColor, getLevelFitLabel } from '../lib/utils';
import type { SpotForecast, SurfLevel, HintTag, WeatherAlert } from '../types';

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
  /** 즐겨찾기 여부 - true면 하트 채워짐 */
  isFavorited?: boolean;
  /** 즐겨찾기 토글 핸들러 - 하트 버튼 클릭 시 호출 */
  onToggleFavorite?: () => void;
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

/**
 * 기상특보 배너 컴포넌트
 * isDangerous: true  → 빨간 경고 (풍랑/태풍)
 * isDangerous: false → 주황 주의 (강풍)
 */
function WeatherAlertBanner({ alert }: { alert: WeatherAlert }) {
  if (!alert.alertName) return null;

  const isDangerous = alert.isDangerous;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 mb-2 ${
        isDangerous
          ? 'bg-red-500/15 border border-red-500/30'
          : 'bg-orange-500/15 border border-orange-500/30'
      }`}
    >
      {isDangerous ? (
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-500" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-500" />
      )}
      <span
        className={`text-[11px] font-bold ${isDangerous ? 'text-red-500' : 'text-orange-500'}`}
      >
        {alert.alertName} 발령 중
      </span>
      {alert.level === '경보' && (
        <span className="ml-auto text-[10px] font-semibold text-red-400">입수 금지</span>
      )}
      {alert.level === '주의보' && isDangerous && (
        <span className="ml-auto text-[10px] font-semibold text-orange-400">입수 위험</span>
      )}
    </div>
  );
}

export function SpotCard({ data, currentLevel, onClick, isFavorited, onToggleFavorite }: SpotCardProps) {
  const { spot, forecast, surfRating, levelFit, recommendationKo, safetyReasons } = data;

  /** 기상특보 — 발령 중인 경우만 배너 표시 */
  const weatherAlert = data.weatherAlert;

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
      {/* ── 상단: 왼쪽(스팟명 크게) + 오른쪽(점수 원형) ── */}
      <div className="flex justify-between items-start mb-2">
        {/* 왼쪽: 스팟 이름 (크게) + 지역·난이도 + 즐겨찾기 하트 */}
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {/* 즐겨찾기 하트 버튼 */}
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="p-0.5 mt-0.5 rounded-full hover:bg-secondary/50 transition-colors shrink-0"
              aria-label={isFavorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorited
                    ? 'text-red-500 fill-red-500'
                    : 'text-muted-foreground/40'
                }`}
              />
            </button>
          )}
          <div className="min-w-0">
            {/* 스팟 이름 — 가독성을 위해 크고 굵게 */}
            <h3 className="font-extrabold text-base leading-tight truncate">{spot.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {spot.region} · {getDifficultyShort(spot.difficulty)}
            </p>
          </div>
        </div>

        {/* 오른쪽: 점수 원형 배지 (가독성 핵심!) */}
        <div className="shrink-0 ml-2">
          {isBlocked ? (
            /* BLOCKED: 빨간 차단 배지 */
            <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center"
              style={{ backgroundColor: '#E74C3C18' }}
            >
              <span className="text-[10px] font-bold text-[#E74C3C]">차단</span>
            </div>
          ) : (
            /* 점수 원형 — 등급 색상 배경 + 큰 숫자 */
            <div
              className="w-12 h-12 rounded-full flex flex-col items-center justify-center"
              style={{ backgroundColor: `${ratingColor}18` }}
            >
              <span className="text-lg font-black leading-none" style={{ color: ratingColor }}>
                {surfRating.toFixed(1)}
              </span>
              <span className="text-[8px] font-bold" style={{ color: ratingColor }}>
                {ratingGrade}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 기상청 특보 배너 (풍랑/강풍/태풍 발령 시) ── */}
      {weatherAlert?.alertName && (
        <WeatherAlertBanner alert={weatherAlert} />
      )}

      {/* ── BLOCKED 차단 사유 / WARNING 주의 / PASS 안전 배지 ── */}
      {isBlocked && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px] text-[#E74C3C]">
            {safetyReasons?.[0] || '서핑 불가'}
          </span>
        </div>
      )}
      {!isBlocked && (isWarning || fitResult === 'PASS') && (
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${fitColor}20`, color: fitColor }}
          >
            {fitLabel}
          </span>
        </div>
      )}

      {/* ── 파고 + 주기/풍속/조석 한줄 ── */}
      <div className="flex items-baseline gap-2 mb-2">
        {/* 파고 크게 (핵심 수치) */}
        <span className="text-2xl font-black leading-none">
          {Number(forecast.waveHeight).toFixed(1)}
        </span>
        <span className="text-xs font-medium text-muted-foreground">m</span>

        {/* 구분선 */}
        <span className="text-border">|</span>

        {/* 주기/풍속/조석 인라인 */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            <span className="font-semibold text-foreground">{Number(forecast.wavePeriod).toFixed(0)}s</span>
          </div>
          {forecast.windSpeed && (
            <div className="flex items-center gap-0.5">
              <Wind className="w-3 h-3" />
              <span className="font-semibold text-foreground">{Number(forecast.windSpeed).toFixed(0)}km/h</span>
            </div>
          )}
          {forecast.tideStatus && (
            <div className="flex items-center gap-0.5">
              {tideInfo.rising ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span className="font-semibold text-foreground">{tideInfo.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* (주기/풍속/조석은 파고 옆 인라인으로 이동됨) */}

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

      {/* KHOA 정부 서핑지수 뱃지 (한국 스팟 전용) */}
      {data.khoaEnrichment?.khoaIndex && (
        <KhoaBadge index={data.khoaEnrichment.khoaIndex} />
      )}

      {/* hints 메시지 또는 기존 추천 문구 */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {data.hints?.message || recommendationKo}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────
// KHOA 정부 서핑지수 뱃지
// ────────────────────────────────────────────

/** KHOA 지수 → 색상 */
function getKhoaColor(index: string): string {
  switch (index) {
    case '매우좋음': return '#2ECC71';
    case '좋음':     return '#27AE60';
    case '보통':     return '#F1C40F';
    case '나쁨':     return '#E67E22';
    case '매우나쁨': return '#E74C3C';
    default:         return '#95A5A6';
  }
}

/**
 * KhoaBadge
 * SpotCard 하단에 표시되는 정부 서핑지수 뱃지
 * ⓘ 탭하면 설명 펼쳐짐
 */
function KhoaBadge({ index }: { index: string }) {
  const [expanded, setExpanded] = useState(false);
  const color = getKhoaColor(index);

  return (
    <div className="mb-1.5">
      {/* 뱃지 행 */}
      <div className="flex items-center gap-1.5">
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold"
          style={{ borderColor: `${color}50`, backgroundColor: `${color}15`, color }}
        >
          <span>🏛</span>
          <span>정부 서핑지수</span>
          <span className="font-black">{index}</span>
        </div>
        {/* ⓘ 설명 토글 버튼 */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          aria-label="정부 서핑지수 설명"
        >
          ⓘ
        </button>
      </div>

      {/* 펼쳐지는 설명 */}
      {expanded && (
        <div
          className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed px-2 py-1.5 rounded-lg"
          style={{ backgroundColor: `${color}08`, borderLeft: `2px solid ${color}40` }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold text-foreground/70 mb-0.5">🏛 국립해양조사원 공식 서핑지수</p>
          <p>해양수산부 산하 국립해양조사원이 한국 연안 해양 관측 데이터를 기반으로 산출한 공식 지수입니다.</p>
          <p className="mt-0.5 text-muted-foreground/60">초급·중급·상급 레벨별 제공 · 매일 오전 9시 업데이트</p>
        </div>
      )}
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
