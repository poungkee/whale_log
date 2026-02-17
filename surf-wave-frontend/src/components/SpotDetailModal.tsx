/**
 * @file SpotDetailModal.tsx
 * @description 스팟 상세 정보 모달 - Surfline 신호등 색상 통일
 *
 * 2개 뷰:
 * 1. "적합도" 탭: 5개 적합도 바 차트 + 스웰/바람/조석 상세
 * 2. "시간별" 탭: recharts 라인 차트 (파고/풍속/조석 시간별 추이)
 *
 * 색상 체계: Surfline 신호등 색상 (utils.ts)
 * - 상단 점수: getRatingColor() 적용
 * - 적합도 바: 초록/연초록/보라/노랑/주황
 * - 안전 배너: BLOCKED=#E74C3C, WARNING=#F1C40F
 * - 바람: OFFSHORE=#2ECC71, ONSHORE=#E74C3C, CROSS=#F1C40F
 *
 * 시간별 예보 API: GET /api/v1/spots/:spotId/forecast?hours=24
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, AlertTriangle, Waves, Wind,
  ArrowUp, ArrowDown, Navigation, BarChart3, TrendingUp,
  Thermometer, Droplets, Cloud,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getRatingGrade, getRatingColor } from '../lib/utils';
import type { SpotForecast, SurfLevel, RatingDetail, ForecastInfo } from '../types';
import { SpotVote } from './SpotVote';

interface SpotDetailModalProps {
  /** 스팟 예보 데이터 (대시보드에서 전달) */
  data: SpotForecast;
  /** 현재 사용자 레벨 */
  currentLevel: SurfLevel;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
}

/** 상세 모달의 탭 종류 */
type DetailTab = 'fit' | 'chart';

/** 바람이 offshore인지 판별 - 해안 방향 기준 */
function getWindType(windDir: number | null, coastFacingDeg: number | null): string {
  if (windDir == null || coastFacingDeg == null) return '';
  const windTo = (windDir + 180) % 360;
  const diff = Math.abs(windTo - coastFacingDeg);
  const angle = diff > 180 ? 360 - diff : diff;
  if (angle < 60) return 'OFFSHORE';
  if (angle > 120) return 'ONSHORE';
  return 'CROSS';
}

/** 방향 각도 → 나침반 텍스트 변환 */
function degToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/** 조석 상태 한국어 변환 */
function getTideStatusKo(status: string | null): string {
  switch (status) {
    case 'RISING': return '밀물';
    case 'FALLING': return '썰물';
    case 'HIGH': return '만조';
    case 'LOW': return '간조';
    default: return '-';
  }
}

/**
 * 바람 종류별 색상 반환
 * OFFSHORE: 초록 (좋음), ONSHORE: 빨강 (나쁨), CROSS: 노랑 (보통)
 */
function getWindTypeColor(type: string): string {
  switch (type) {
    case 'OFFSHORE': return '#2ECC71';
    case 'ONSHORE': return '#E74C3C';
    case 'CROSS': return '#F1C40F';
    default: return '#95A5A6';
  }
}

/**
 * 적합도 바 차트 항목 정의 - Surfline 신호등 색상
 * 초록 → 연초록 → 보라 → 노랑 → 주황
 */
const FIT_LABELS: { key: keyof RatingDetail; label: string; color: string }[] = [
  { key: 'waveFit', label: '파고 적합도', color: '#2ECC71' },   // 초록
  { key: 'periodFit', label: '주기 적합도', color: '#82E0AA' },  // 연초록
  { key: 'swellFit', label: '스웰 방향', color: '#9B59B6' },     // 보라
  { key: 'windSpeedFit', label: '바람 세기', color: '#F1C40F' }, // 노랑
  { key: 'windDirFit', label: '바람 방향', color: '#E67E22' },   // 주황
];

/**
 * 날씨 상태 한국어 → 이모지 매핑
 * 백엔드 weatherCondition 값에 대응
 */
function getWeatherEmoji(condition: string | null): string {
  if (!condition) return '';
  if (condition.includes('맑음')) return '☀️';
  if (condition.includes('구름')) return '⛅';
  if (condition.includes('흐림')) return '☁️';
  if (condition.includes('안개')) return '🌫️';
  if (condition.includes('이슬비')) return '🌦️';
  if (condition.includes('비')) return '🌧️';
  if (condition.includes('소나기')) return '🌧️';
  if (condition.includes('눈')) return '🌨️';
  if (condition.includes('뇌우')) return '⛈️';
  return '☁️';
}

/** 시간 포맷 (예: "14시", "03시") */
function formatHour(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  return `${h}시`;
}

/** 차트용 커스텀 툴팁 컴포넌트 */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value?.toFixed(1)}</span>
        </p>
      ))}
    </div>
  );
}

export function SpotDetailModal({ data, currentLevel, onClose }: SpotDetailModalProps) {
  const { spot, forecast, surfRating, detail, safetyReasons, levelFit } = data;
  const fitResult = levelFit?.[currentLevel] || 'PASS';

  /** 현재 선택된 탭 */
  const [activeTab, setActiveTab] = useState<DetailTab>('fit');
  /** 시간별 예보 데이터 (API에서 가져옴) */
  const [hourlyData, setHourlyData] = useState<ForecastInfo[]>([]);
  /** 시간별 데이터 로딩 상태 */
  const [chartLoading, setChartLoading] = useState(false);

  /** 신호등 색상 - 상단 점수 표시용 */
  const ratingColor = getRatingColor(surfRating);
  const ratingGrade = getRatingGrade(surfRating);

  /** 바람 종류 판별 (OFFSHORE/ONSHORE/CROSS) */
  const windType = forecast?.windDirection
    ? getWindType(Number(forecast.windDirection), spot.coastFacingDeg)
    : '';

  /**
   * 시간별 예보 데이터 가져오기
   * GET /api/v1/spots/:spotId/forecast?hours=24
   */
  useEffect(() => {
    const fetchHourly = async () => {
      setChartLoading(true);
      try {
        const res = await fetch(`/api/v1/spots/${spot.id}/forecast?hours=24`);
        if (res.ok) {
          const json = await res.json();
          setHourlyData(Array.isArray(json) ? json : []);
        }
      } catch {
        /* 차트 데이터 실패해도 적합도 탭은 정상 표시 */
      } finally {
        setChartLoading(false);
      }
    };
    fetchHourly();
  }, [spot.id]);

  /** 차트용 데이터 변환 - 시간별 파고/풍속/조석/기온/수온 */
  const chartData = hourlyData.map(h => ({
    time: formatHour(h.forecastTime),
    파고: Number(h.waveHeight) || 0,
    풍속: h.windSpeed ? Number(h.windSpeed) : 0,
    조석: h.tideHeight ? Number(h.tideHeight) : 0,
    기온: h.airTemperature ? Number(h.airTemperature) : null,
    수온: h.waterTemperature ? Number(h.waterTemperature) : null,
  }));

  /** 날씨 타임라인 데이터 - 3시간 간격으로 추출 */
  const weatherTimeline = hourlyData
    .filter((_, i) => i % 3 === 0)
    .map(h => ({
      hour: new Date(h.forecastTime).getHours(),
      label: `${new Date(h.forecastTime).getHours()}시`,
      emoji: getWeatherEmoji(h.weatherCondition),
      condition: h.weatherCondition || '',
    }));

  /** 기온/수온 데이터 존재 여부 확인 */
  const hasTemperatureData = chartData.some(d => d.기온 !== null || d.수온 !== null);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* 헤더 */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold truncate">{spot.name} 상세 경보</h1>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-4 pb-8">
        {/* 안전 경고 배너 - BLOCKED는 빨강, WARNING은 노랑 */}
        {safetyReasons && safetyReasons.length > 0 && (
          <div className={`mb-4 p-3 rounded-lg border ${
            fitResult === 'BLOCKED'
              ? 'bg-[#E74C3C]/10 border-[#E74C3C]/30'
              : 'bg-[#F1C40F]/10 border-[#F1C40F]/30'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                fitResult === 'BLOCKED' ? 'text-[#E74C3C]' : 'text-[#F1C40F]'
              }`} />
              <div>
                {safetyReasons.map((reason, i) => (
                  <p key={i} className={`text-xs ${
                    fitResult === 'BLOCKED' ? 'text-[#E74C3C]' : 'text-[#F1C40F]'
                  }`}>
                    {reason}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 종합 점수 + 탭 전환 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            {fitResult === 'BLOCKED' ? (
              <>
                {/* BLOCKED: 점수 대신 "차단" 표시 */}
                <span className="text-2xl font-black text-[#E74C3C]">차단</span>
                <span className="text-xs text-[#E74C3C]/70">서핑 불가</span>
              </>
            ) : (
              <>
                {/* surfRating 점수 - 신호등 색상 */}
                <span className="text-3xl font-black" style={{ color: ratingColor }}>
                  {surfRating.toFixed(1)}
                </span>
                {/* 등급 텍스트 */}
                <span className="text-sm font-bold" style={{ color: ratingColor }}>
                  {ratingGrade}
                </span>
              </>
            )}
          </div>
          {/* 탭 전환 버튼 */}
          <div className="flex bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('fit')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'fit'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              적합도
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'chart'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              시간별
            </button>
          </div>
        </div>

        {/* ====== 적합도 탭 ====== */}
        {activeTab === 'fit' && forecast && detail && (
          <>
            {/* 5개 적합도 바 차트 - 신호등 색상 적용 */}
            <div className="bg-card rounded-xl border border-border p-4 mb-4">
              <div className="space-y-3">
                {FIT_LABELS.map(({ key, label, color }) => {
                  const value = detail[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-sm font-bold" style={{ color }}>
                          {value.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(value / 10) * 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 상세 정보: 스웰/바람/조석 */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              {/* 스웰 정보 */}
              <div className="flex items-center gap-2 text-sm">
                <Waves className="w-4 h-4 text-[#2ECC71] flex-shrink-0" />
                <span className="text-muted-foreground">스웰</span>
                <span className="font-medium ml-auto">
                  {forecast.swellHeight ? `${Number(forecast.swellHeight).toFixed(1)}m` : '-'}
                  {forecast.swellPeriod ? ` @${Number(forecast.swellPeriod).toFixed(0)}s` : ''}
                  {forecast.swellDirection ? ` → ${degToCompass(Number(forecast.swellDirection))} ${Number(forecast.swellDirection).toFixed(0)}°` : ''}
                </span>
              </div>

              {/* 바람 정보 - OFFSHORE/ONSHORE/CROSS 색상 */}
              <div className="flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-[#F1C40F] flex-shrink-0" />
                <span className="text-muted-foreground">바람</span>
                <span className="font-medium ml-auto">
                  {forecast.windSpeed ? `${Number(forecast.windSpeed).toFixed(0)}km/h` : '-'}
                  {windType && (
                    <span className="ml-1 text-xs font-bold" style={{ color: getWindTypeColor(windType) }}>
                      {windType}
                    </span>
                  )}
                  {forecast.windDirection && (
                    <span className="ml-1">
                      <Navigation className="w-3 h-3 inline" style={{
                        transform: `rotate(${Number(forecast.windDirection)}deg)`
                      }} />
                      {' '}{Number(forecast.windDirection).toFixed(0)}°
                    </span>
                  )}
                </span>
              </div>

              {/* 조석 정보 */}
              {forecast.tideHeight && (
                <div className="flex items-center gap-2 text-sm">
                  {forecast.tideStatus === 'RISING' || forecast.tideStatus === 'HIGH'
                    ? <ArrowUp className="w-4 h-4 text-[#2ECC71] flex-shrink-0" />
                    : <ArrowDown className="w-4 h-4 text-[#E67E22] flex-shrink-0" />
                  }
                  <span className="text-muted-foreground">조석</span>
                  <span className="font-medium ml-auto">
                    {getTideStatusKo(forecast.tideStatus)} {Number(forecast.tideHeight).toFixed(2)}m
                  </span>
                </div>
              )}

              {/* 구분선 */}
              <div className="border-t border-border my-2" />

              {/* 수온 */}
              {forecast.waterTemperature != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Droplets className="w-4 h-4 text-[#3498DB] flex-shrink-0" />
                  <span className="text-muted-foreground">수온</span>
                  <span className="font-medium ml-auto">
                    {Number(forecast.waterTemperature).toFixed(1)}°C
                  </span>
                </div>
              )}

              {/* 기온 */}
              {forecast.airTemperature != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Thermometer className="w-4 h-4 text-[#E67E22] flex-shrink-0" />
                  <span className="text-muted-foreground">기온</span>
                  <span className="font-medium ml-auto">
                    {Number(forecast.airTemperature).toFixed(1)}°C
                  </span>
                </div>
              )}

              {/* 날씨 */}
              {forecast.weatherCondition && (
                <div className="flex items-center gap-2 text-sm">
                  <Cloud className="w-4 h-4 text-[#95A5A6] flex-shrink-0" />
                  <span className="text-muted-foreground">날씨</span>
                  <span className="font-medium ml-auto">
                    {getWeatherEmoji(forecast.weatherCondition)} {forecast.weatherCondition}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ====== 시간별 차트 탭 ====== */}
        {activeTab === 'chart' && (
          <div className="space-y-4">
            {chartLoading ? (
              /* 로딩 스켈레톤 */
              <div className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="h-48 bg-secondary rounded" />
              </div>
            ) : chartData.length > 0 ? (
              <>
                {/* 파고 / 풍속 차트 - 신호등 색상 적용 */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="text-xs font-bold text-muted-foreground mb-3">파고 / 풍속 (24시간)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: '#999' }}
                        interval={2}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#999' }}
                        width={30}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line
                        type="monotone"
                        dataKey="파고"
                        stroke="#2ECC71"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#2ECC71' }}
                        activeDot={{ r: 4 }}
                        unit="m"
                      />
                      <Line
                        type="monotone"
                        dataKey="풍속"
                        stroke="#F1C40F"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#F1C40F' }}
                        activeDot={{ r: 4 }}
                        unit="km/h"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 조석 차트 */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <h3 className="text-xs font-bold text-muted-foreground mb-3">조석 높이 (24시간)</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: '#999' }}
                        interval={2}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#999' }}
                        width={30}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="조석"
                        stroke="#82E0AA"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#82E0AA' }}
                        activeDot={{ r: 4 }}
                        fill="url(#tideGradient)"
                        unit="m"
                      />
                      <defs>
                        <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#82E0AA" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#82E0AA" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 기온 / 수온 차트 (신규) */}
                {hasTemperatureData && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="text-xs font-bold text-muted-foreground mb-3">
                      <Thermometer className="w-3 h-3 inline mr-1" />
                      기온 / 수온 (24시간)
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: '#999' }}
                          interval={2}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#999' }}
                          width={30}
                          unit="°"
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        {/* 기온 라인 - 주황색 */}
                        <Line
                          type="monotone"
                          dataKey="기온"
                          stroke="#E67E22"
                          strokeWidth={2}
                          dot={{ r: 2, fill: '#E67E22' }}
                          activeDot={{ r: 4 }}
                          unit="°C"
                          connectNulls
                        />
                        {/* 수온 라인 - 파란색 */}
                        <Line
                          type="monotone"
                          dataKey="수온"
                          stroke="#3498DB"
                          strokeWidth={2}
                          dot={{ r: 2, fill: '#3498DB' }}
                          activeDot={{ r: 4 }}
                          unit="°C"
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 날씨 타임라인 (신규) - 3시간 간격 이모지 */}
                {weatherTimeline.length > 0 && weatherTimeline.some(w => w.emoji) && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="text-xs font-bold text-muted-foreground mb-3">
                      <Cloud className="w-3 h-3 inline mr-1" />
                      날씨 변화 (24시간)
                    </h3>
                    <div className="flex justify-between">
                      {weatherTimeline.map((w, i) => {
                        /* 06~18시는 주간(밝은 배경), 나머지 야간(어두운 배경) */
                        const isDaytime = w.hour >= 6 && w.hour < 18;
                        return (
                          <div
                            key={i}
                            className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg flex-1 ${
                              isDaytime ? 'bg-amber-500/10' : 'bg-slate-500/10'
                            }`}
                          >
                            {/* 날씨 이모지 */}
                            <span className="text-lg">{w.emoji || '—'}</span>
                            {/* 시간 라벨 */}
                            <span className="text-[10px] text-muted-foreground font-medium">{w.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 현재 상세 요약 */}
                {forecast && (
                  <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground mb-2">현재 요약</h3>
                    {/* 스웰 요약 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Waves className="w-4 h-4 text-[#2ECC71]" />
                      <span className="text-muted-foreground">스웰</span>
                      <span className="font-medium ml-auto">
                        {forecast.swellHeight ? `${Number(forecast.swellHeight).toFixed(1)}m @${Number(forecast.swellPeriod || 0).toFixed(0)}s → ${Number(forecast.swellDirection || 0).toFixed(0)}°` : '-'}
                      </span>
                    </div>
                    {/* 바람 요약 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Wind className="w-4 h-4 text-[#F1C40F]" />
                      <span className="text-muted-foreground">바람</span>
                      <span className="font-medium ml-auto">
                        {forecast.windSpeed ? `${Number(forecast.windSpeed).toFixed(0)}km/h` : '-'}
                        {windType && (
                          <span className="ml-1 text-xs font-bold" style={{ color: getWindTypeColor(windType) }}>
                            {windType}
                          </span>
                        )}
                        {forecast.windDirection ? ` ↑${Number(forecast.windDirection).toFixed(0)}°` : ''}
                      </span>
                    </div>
                    {/* 조석 요약 */}
                    {forecast.tideHeight && (
                      <div className="flex items-center gap-2 text-sm">
                        {forecast.tideStatus === 'RISING' || forecast.tideStatus === 'HIGH'
                          ? <ArrowUp className="w-4 h-4 text-[#2ECC71]" />
                          : <ArrowDown className="w-4 h-4 text-[#E67E22]" />
                        }
                        <span className="text-muted-foreground">조석</span>
                        <span className="font-medium ml-auto">
                          {getTideStatusKo(forecast.tideStatus)} {Number(forecast.tideHeight).toFixed(2)}m
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">시간별 예보 데이터가 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* 오늘의 컨디션 투표 */}
        <div className="px-4 py-3">
          <SpotVote spotId={spot.id} />
        </div>

        {/* 예보 없음 */}
        {!forecast && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">예보 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
