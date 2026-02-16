/**
 * @file SpotDetailModal.tsx
 * @description 스팟 상세 정보 모달 - 디자인 v3 (시간별 차트 포함)
 *
 * 2개 뷰:
 * 1. "적합도" 탭: 5개 적합도 바 차트 + 스웰/바람/조석 상세
 * 2. "시간별" 탭: recharts 라인 차트 (파고/풍속/조석 시간별 추이)
 *
 * 시간별 예보 API: GET /api/v1/spots/:spotId/forecast?hours=24
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, AlertTriangle, Waves, Wind,
  ArrowUp, ArrowDown, Navigation, BarChart3, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { SpotForecast, SurfLevel, RatingDetail, ForecastInfo } from '../types';

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

/** 바람이 offshore인지 판별 */
function getWindType(windDir: number | null, coastFacingDeg: number | null): string {
  if (windDir == null || coastFacingDeg == null) return '';
  const windTo = (windDir + 180) % 360;
  const diff = Math.abs(windTo - coastFacingDeg);
  const angle = diff > 180 ? 360 - diff : diff;
  if (angle < 60) return 'OFFSHORE';
  if (angle > 120) return 'ONSHORE';
  return 'CROSS';
}

/** 방향 각도 → 나침반 텍스트 */
function degToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/** 조석 상태 한국어 */
function getTideStatusKo(status: string | null): string {
  switch (status) {
    case 'RISING': return '밀물';
    case 'FALLING': return '썰물';
    case 'HIGH': return '만조';
    case 'LOW': return '간조';
    default: return '-';
  }
}

/** 적합도 바 차트 항목 정의 */
const FIT_LABELS: { key: keyof RatingDetail; label: string; color: string }[] = [
  { key: 'waveFit', label: '파고 적합도', color: '#00BCD4' },
  { key: 'periodFit', label: '주기 적합도', color: '#008CBA' },
  { key: 'swellFit', label: '스웰 방향', color: '#4CAF50' },
  { key: 'windSpeedFit', label: '바람 세기', color: '#FF8C00' },
  { key: 'windDirFit', label: '바람 방향', color: '#FFD700' },
];

/** 시간 포맷 (예: "14시", "03시") */
function formatHour(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  return `${h}시`;
}

/** 차트용 커스텀 툴팁 */
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

  /** 바람 종류 판별 */
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

  /** 차트용 데이터 변환 - 시간별 파고/풍속/조석 */
  const chartData = hourlyData.map(h => ({
    time: formatHour(h.forecastTime),
    파고: Number(h.waveHeight) || 0,
    풍속: h.windSpeed ? Number(h.windSpeed) : 0,
    조석: h.tideHeight ? Number(h.tideHeight) : 0,
  }));

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
        {/* 안전 경고 배너 */}
        {safetyReasons && safetyReasons.length > 0 && (
          <div className={`mb-4 p-3 rounded-lg border ${
            fitResult === 'BLOCKED'
              ? 'bg-[#FF4444]/10 border-[#FF4444]/30'
              : 'bg-[#FF8C00]/10 border-[#FF8C00]/30'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                fitResult === 'BLOCKED' ? 'text-[#FF4444]' : 'text-[#FF8C00]'
              }`} />
              <div>
                {safetyReasons.map((reason, i) => (
                  <p key={i} className={`text-xs ${
                    fitResult === 'BLOCKED' ? 'text-[#FF4444]' : 'text-[#FF8C00]'
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
            <span className="text-3xl font-black" style={{
              color: surfRating >= 8 ? '#32CD32' :
                     surfRating >= 6 ? '#00BCD4' :
                     surfRating >= 4 ? '#008CBA' :
                     surfRating >= 2 ? '#FF8C00' : '#FF4444'
            }}>
              {surfRating.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-muted-foreground">
              {surfRating >= 8 ? 'EPIC' :
               surfRating >= 6 ? 'GREAT' :
               surfRating >= 4 ? 'GOOD' :
               surfRating >= 2 ? 'FAIR' : 'POOR'}
            </span>
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
            {/* 5개 적합도 바 차트 */}
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
              {/* 스웰 */}
              <div className="flex items-center gap-2 text-sm">
                <Waves className="w-4 h-4 text-[#00BCD4] flex-shrink-0" />
                <span className="text-muted-foreground">스웰</span>
                <span className="font-medium ml-auto">
                  {forecast.swellHeight ? `${Number(forecast.swellHeight).toFixed(1)}m` : '-'}
                  {forecast.swellPeriod ? ` @${Number(forecast.swellPeriod).toFixed(0)}s` : ''}
                  {forecast.swellDirection ? ` → ${degToCompass(Number(forecast.swellDirection))} ${Number(forecast.swellDirection).toFixed(0)}°` : ''}
                </span>
              </div>

              {/* 바람 */}
              <div className="flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-[#FF8C00] flex-shrink-0" />
                <span className="text-muted-foreground">바람</span>
                <span className="font-medium ml-auto">
                  {forecast.windSpeed ? `${Number(forecast.windSpeed).toFixed(0)}km/h` : '-'}
                  {windType && (
                    <span className={`ml-1 text-xs font-bold ${
                      windType === 'OFFSHORE' ? 'text-[#32CD32]' :
                      windType === 'ONSHORE' ? 'text-[#FF4444]' : 'text-[#FF8C00]'
                    }`}>
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

              {/* 조석 */}
              {forecast.tideHeight && (
                <div className="flex items-center gap-2 text-sm">
                  {forecast.tideStatus === 'RISING' || forecast.tideStatus === 'HIGH'
                    ? <ArrowUp className="w-4 h-4 text-[#32CD32] flex-shrink-0" />
                    : <ArrowDown className="w-4 h-4 text-[#FF8C00] flex-shrink-0" />
                  }
                  <span className="text-muted-foreground">조석</span>
                  <span className="font-medium ml-auto">
                    {getTideStatusKo(forecast.tideStatus)} {Number(forecast.tideHeight).toFixed(2)}m
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
                {/* 파고 차트 */}
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
                      <Legend
                        wrapperStyle={{ fontSize: '11px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="파고"
                        stroke="#00BCD4"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#00BCD4' }}
                        activeDot={{ r: 4 }}
                        unit="m"
                      />
                      <Line
                        type="monotone"
                        dataKey="풍속"
                        stroke="#FF8C00"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#FF8C00' }}
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
                        stroke="#32CD32"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#32CD32' }}
                        activeDot={{ r: 4 }}
                        fill="url(#tideGradient)"
                        unit="m"
                      />
                      <defs>
                        <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#32CD32" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#32CD32" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 현재 상세 요약 */}
                {forecast && (
                  <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground mb-2">현재 요약</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Waves className="w-4 h-4 text-[#00BCD4]" />
                      <span className="text-muted-foreground">스웰</span>
                      <span className="font-medium ml-auto">
                        {forecast.swellHeight ? `${Number(forecast.swellHeight).toFixed(1)}m @${Number(forecast.swellPeriod || 0).toFixed(0)}s → ${Number(forecast.swellDirection || 0).toFixed(0)}°` : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Wind className="w-4 h-4 text-[#FF8C00]" />
                      <span className="text-muted-foreground">바람</span>
                      <span className="font-medium ml-auto">
                        {forecast.windSpeed ? `${Number(forecast.windSpeed).toFixed(0)}km/h` : '-'}
                        {windType && (
                          <span className={`ml-1 text-xs font-bold ${
                            windType === 'OFFSHORE' ? 'text-[#32CD32]' :
                            windType === 'ONSHORE' ? 'text-[#FF4444]' : 'text-[#FF8C00]'
                          }`}>{windType}</span>
                        )}
                        {forecast.windDirection ? ` ↑${Number(forecast.windDirection).toFixed(0)}°` : ''}
                      </span>
                    </div>
                    {forecast.tideHeight && (
                      <div className="flex items-center gap-2 text-sm">
                        {forecast.tideStatus === 'RISING' || forecast.tideStatus === 'HIGH'
                          ? <ArrowUp className="w-4 h-4 text-[#32CD32]" />
                          : <ArrowDown className="w-4 h-4 text-[#FF8C00]" />
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
