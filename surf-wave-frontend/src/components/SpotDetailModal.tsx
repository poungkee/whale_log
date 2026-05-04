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

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, AlertTriangle, Waves, Wind,
  ArrowUp, ArrowDown,
  Thermometer, Droplets, Cloud, BookOpen, MapPin, Clock,
  Star, Sunrise, ChevronDown, Loader2, MessageCircle, Flag,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getRatingGrade, getRatingColor } from '../lib/utils';
import { formatWindSpeed, kmhToMs } from '../lib/units';
import {
  getWindType,
  getWindTypeLabel,
  getWindTypeColor,
  formatWindDirection,
  degToCompassKo,
} from '../lib/wind';

/** KHOA 서핑지수 → 색상 (SpotCard의 getKhoaColor와 동일) */
function getKhoaIndexColor(index: string): string {
  switch (index) {
    case '매우좋음': return '#2ECC71';
    case '좋음':     return '#27AE60';
    case '보통':     return '#F1C40F';
    case '나쁨':     return '#E67E22';
    case '매우나쁨': return '#E74C3C';
    default:         return '#95A5A6';
  }
}
import type { SpotForecast, SurfLevel, RatingDetail, ForecastInfo } from '../types';
import { SpotVote } from './SpotVote';
import { CommunityFeed } from './community/CommunityFeed';
import { DiaryInteractions } from './DiaryInteractions';
import { ReportModal } from './ReportModal';
import { SpotSatelliteMap } from './SpotSatelliteMap';

interface SpotDetailModalProps {
  /** 스팟 예보 데이터 (대시보드에서 전달) */
  data: SpotForecast;
  /** 현재 사용자 레벨 */
  currentLevel: SurfLevel;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
}

/** 상세 모달의 탭 종류 — 파도(적합도+시간별+컨디션투표) / 기록(공개 다이어리)
 *  Phase 2에서 [소통](Posts) 탭 제거 — 다이어리 통합으로 대체
 */
type DetailTab = 'wave' | 'diary';

/**
 * 스팟별 공개 다이어리 항목 타입
 * GET /api/v1/diary/public?spotId=xxx 응답 기반
 */
interface PublicDiaryEntry {
  id: string;
  surfDate: string;
  /** 서핑 시작 시간 (HH:mm) */
  surfTime: string | null;
  boardType: string;
  durationMinutes: number;
  satisfaction: number;
  memo: string | null;
  waveHeight: string | null;
  wavePeriod: string | null;
  windSpeed: string | null;
  /** 작성자 정보 (공개 다이어리용 - 닉네임/아바타만 노출) */
  user: { id: string; username: string | null; avatarUrl: string | null };
  spot: { id: string; name: string; region: string } | null;
}

/** 보드 타입별 이모지 + 한국어 라벨 — 백엔드 BoardType 8종류 + MIDLENGTH(레거시) */
const DIARY_BOARD_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  LONGBOARD: { emoji: '🏄', label: '롱보드', color: '#32CD32' },
  FUNBOARD: { emoji: '🛹', label: '펀보드', color: '#008CBA' },
  MIDLENGTH: { emoji: '🏄‍♂️', label: '미드렝스', color: '#6366F1' },
  FISH: { emoji: '🐟', label: '피쉬', color: '#EC4899' },
  SHORTBOARD: { emoji: '🏄‍♀️', label: '숏보드', color: '#FF8C00' },
  SUP: { emoji: '🚣', label: 'SUP', color: '#14B8A6' },
  BODYBOARD: { emoji: '🤸', label: '바디보드', color: '#8B5CF6' },
  FOIL: { emoji: '🪁', label: '포일', color: '#0EA5E9' },
  OTHER: { emoji: '🏖️', label: '기타', color: '#6B7280' },
};

/** 만족도별 이모지 + 색상 */
const DIARY_SAT_CONFIG: Record<number, { emoji: string; color: string; label: string }> = {
  1: { emoji: '😞', color: '#ef4444', label: '별로' },
  2: { emoji: '😕', color: '#f97316', label: '아쉬움' },
  3: { emoji: '😊', color: '#eab308', label: '보통' },
  4: { emoji: '😄', color: '#22c55e', label: '좋음' },
  5: { emoji: '🤩', color: '#3b82f6', label: '최고' },
};

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
  const [activeTab, setActiveTab] = useState<DetailTab>('wave');
  /** 시간별 예보 데이터 (API에서 가져옴) */
  const [hourlyData, setHourlyData] = useState<ForecastInfo[]>([]);
  /** 시간별 데이터 로딩 상태 */
  const [chartLoading, setChartLoading] = useState(false);

  /* ===== 서핑 기록 탭 상태 ===== */
  /** 이 스팟의 공개 다이어리 목록 */
  const [publicDiaries, setPublicDiaries] = useState<PublicDiaryEntry[]>([]);
  /** 다이어리 로딩 상태 */
  const [diaryLoading, setDiaryLoading] = useState(false);
  /** 다이어리 총 건수 */
  const [diaryTotal, setDiaryTotal] = useState(0);
  /** 다이어리 현재 페이지 */
  const [diaryPage, setDiaryPage] = useState(1);
  /** 더보기 가능 여부 */
  const [diaryHasMore, setDiaryHasMore] = useState(false);

  /**
   * 다이어리 신고 모달 상태 (Phase 2D)
   * - reportTargetId: 신고 모달이 열려있는 다이어리 ID (null이면 닫힘)
   * - 본인 다이어리는 신고 버튼이 표시되지 않음 (시나리오 F-2)
   */
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  /**
   * 현재 로그인 사용자 ID — 본인 다이어리 신고 메뉴 숨김 처리용
   * localStorage에 저장된 user 객체에서 추출 (App.tsx 인증 흐름과 일치)
   */
  const currentUserId: string | null = (() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: string };
      return parsed.id ?? null;
    } catch {
      return null;
    }
  })();

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
        const res = await fetch(api(`/api/v1/spots/${spot.id}/forecast?hours=24`));
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

  /**
   * 스팟별 공개 다이어리 조회
   * GET /api/v1/diary/public?spotId={spotId}&page={page}&limit=10
   * - 서핑 기록 탭 진입 시 호출 (lazy load)
   * - 더보기 클릭 시 다음 페이지 추가 로드
   */
  const fetchPublicDiaries = useCallback(async (pageNum: number, append = false) => {
    setDiaryLoading(true);
    try {
      /** @Public() 엔드포인트 - 인증 불필요, 비로그인도 조회 가능 */
      const res = await fetch(
        api(`/api/v1/diary/public?spotId=${spot.id}&page=${pageNum}&limit=10`),
      );
      if (!res.ok) throw new Error('공개 다이어리 조회 실패');

      const json = await res.json();
      const items: PublicDiaryEntry[] = json.data || [];
      const meta = json.meta || {};

      /** append=true면 기존 목록에 추가 (더보기), false면 교체 */
      setPublicDiaries(prev => append ? [...prev, ...items] : items);
      setDiaryTotal(meta.totalItems || 0);
      setDiaryHasMore(meta.hasNext || false);
      setDiaryPage(pageNum);
    } catch {
      console.warn('스팟 공개 다이어리 조회 실패');
    } finally {
      setDiaryLoading(false);
    }
  }, [spot.id]);

  /** 서핑 기록 탭 진입 시 데이터 조회 (lazy load - 탭 전환 시에만) */
  useEffect(() => {
    if (activeTab === 'diary' && publicDiaries.length === 0 && diaryTotal === 0) {
      fetchPublicDiaries(1);
    }
  }, [activeTab, publicDiaries.length, diaryTotal, fetchPublicDiaries]);

  /** 차트용 데이터 변환 - 시간별 파고/풍속/조석/기온/수온
   * 풍속은 km/h(DB) → m/s(서핑 표준) 변환하여 차트에 표시
   */
  const chartData = hourlyData.map(h => ({
    time: formatHour(h.forecastTime),
    파고: Number(h.waveHeight) || 0,
    풍속: h.windSpeed ? Number(kmhToMs(h.windSpeed)) : 0,
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
            {/* 파도 탭 — 적합도 + 시간별 차트 통합 */}
            <button
              onClick={() => setActiveTab('wave')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'wave'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Waves className="w-3 h-3" />
              파도
            </button>
            {/* Phase 2: [소통] 탭 제거 — 다이어리 통합으로 대체 */}
            {/* 서핑 기록 탭 - 이 스팟의 공개 다이어리 모아보기 */}
            <button
              onClick={() => setActiveTab('diary')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'diary'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              기록
            </button>
          </div>
        </div>

        {/* 사용자 평균 평점 — 1명 이상이면 표시, 0명이면 숨김 (UX) */}
        {(() => {
          const ratingNum = Number(spot?.rating ?? 0);
          const ratingCount = spot?.ratingCount ?? 0;
          if (ratingCount === 0) return null;
          return (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <span className="text-yellow-500 text-lg">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i}>{i <= Math.round(ratingNum) ? '★' : '☆'}</span>
                ))}
              </span>
              <span className="text-sm font-bold text-yellow-700">
                {ratingNum.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                서퍼 {ratingCount}명 평가
                {ratingCount === 1 && ' (참고용)'}
              </span>
            </div>
          );
        })()}

        {/* ====== 파도 탭 (적합도 + 시간별 통합) ====== */}
        {activeTab === 'wave' && forecast && detail && (
          <>
            {/**
             * 위성지도 + 풍향/스웰 화살표 카드 (Task #84)
             * - 적합도 차트 위쪽에 배치 — 시각적으로 가장 임팩트 큼
             * - hourlyData가 비어있으면 카드 자체 안 표시 (예보 데이터 없음)
             */}
            {hourlyData.length > 0 && (
              <SpotSatelliteMap
                spot={{
                  name: spot.name,
                  latitude: spot.latitude,
                  longitude: spot.longitude,
                  coastFacingDeg: spot.coastFacingDeg,
                }}
                hourlyData={hourlyData}
                lastUpdated={hourlyData[0]?.updatedAt}
              />
            )}

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
              {/* 스웰 정보 — "남서 (135°)" 통일 형식 */}
              <div className="flex items-center gap-2 text-sm">
                <Waves className="w-4 h-4 text-[#2ECC71] flex-shrink-0" />
                <span className="text-muted-foreground">스웰</span>
                <span className="font-medium ml-auto">
                  {forecast.swellHeight ? `${Number(forecast.swellHeight).toFixed(1)}m` : '-'}
                  {forecast.swellPeriod ? ` @${Number(forecast.swellPeriod).toFixed(0)}s` : ''}
                  {forecast.swellDirection
                    ? ` → ${degToCompassKo(Number(forecast.swellDirection))} (${Number(forecast.swellDirection).toFixed(0)}°)`
                    : ''}
                </span>
              </div>

              {/* 바람 정보 — "오프쇼어 · 남서 (270°) · 5m/s" 통일 형식 */}
              <div className="flex items-center gap-2 text-sm">
                <Wind className="w-4 h-4 text-[#F1C40F] flex-shrink-0" />
                <span className="text-muted-foreground">바람</span>
                <span className="font-medium ml-auto flex items-center gap-1">
                  {windType && (
                    <span className="text-xs font-bold" style={{ color: getWindTypeColor(windType) }}>
                      {getWindTypeLabel(windType)}
                    </span>
                  )}
                  {forecast.windDirection && (
                    <>
                      {windType && <span className="text-muted-foreground">·</span>}
                      <span>{formatWindDirection(forecast.windDirection, spot.coastFacingDeg).replace(/^[가-힣]+ · /, '')}</span>
                    </>
                  )}
                  {forecast.windSpeed && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span>{formatWindSpeed(forecast.windSpeed)}</span>
                    </>
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
            {/* ── 시간별 차트 (파도 탭 하단에 통합) ── */}
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
                        unit="m/s"
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

                {/* KHOA 국립해양조사원 실측 비교 (한국 스팟 전용) */}
                {data.khoaEnrichment?.khoaWaveHeight != null && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        🏛 국립해양조사원 실측 데이터
                      </h3>
                      {/* 서핑지수 레벨별 표시 */}
                      <div className="flex gap-1">
                        {[
                          { label: '초급', value: data.khoaEnrichment.beginnerIndex },
                          { label: '중급', value: data.khoaEnrichment.intermediateIndex },
                          { label: '상급', value: data.khoaEnrichment.advancedIndex },
                        ].filter(l => l.value).map(l => (
                          <span
                            key={l.label}
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{
                              backgroundColor: getKhoaIndexColor(l.value!) + '20',
                              color: getKhoaIndexColor(l.value!),
                            }}
                          >
                            {l.label} {l.value}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 파고 비교 - 핵심 */}
                    <div className="bg-secondary/40 rounded-lg p-3 mb-3">
                      <p className="text-[11px] text-muted-foreground mb-2">파고 비교 (연안 보정)</p>
                      <div className="flex items-center gap-3">
                        {/* Open-Meteo */}
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-muted-foreground">Open-Meteo</p>
                          <p className="text-lg font-black text-foreground/60">
                            {Number(forecast.waveHeight).toFixed(1)}
                            <span className="text-xs font-normal ml-0.5">m</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">외해 예보</p>
                        </div>
                        {/* 화살표 + 보정 비율 */}
                        <div className="flex flex-col items-center">
                          <span className="text-lg">→</span>
                          {data.khoaEnrichment.waveHeightRatio != null && (
                            <span className="text-[10px] font-bold text-[#2ECC71]">
                              ×{data.khoaEnrichment.waveHeightRatio.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {/* KHOA */}
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-muted-foreground">KHOA 실측</p>
                          <p className="text-lg font-black text-[#2ECC71]">
                            {data.khoaEnrichment.khoaWaveHeight.toFixed(1)}
                            <span className="text-xs font-normal ml-0.5">m</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">연안 실측</p>
                        </div>
                      </div>
                    </div>

                    {/* 기타 KHOA 수치 */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {data.khoaEnrichment.khoaWavePeriod != null && (
                        <div className="bg-secondary/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">파주기</p>
                          <p className="text-sm font-bold">{data.khoaEnrichment.khoaWavePeriod.toFixed(1)}s</p>
                        </div>
                      )}
                      {data.khoaEnrichment.khoaWindSpeed != null && (
                        <div className="bg-secondary/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">풍속</p>
                          <p className="text-sm font-bold">{data.khoaEnrichment.khoaWindSpeed.toFixed(1)}m/s</p>
                        </div>
                      )}
                      {data.khoaEnrichment.khoaWaterTemperature != null && (
                        <div className="bg-secondary/30 rounded-lg p-2">
                          <p className="text-[10px] text-muted-foreground">수온</p>
                          <p className="text-sm font-bold">{data.khoaEnrichment.khoaWaterTemperature.toFixed(1)}°C</p>
                        </div>
                      )}
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
                    {/* 바람 요약 — "오프쇼어 · 남서 (270°) · 5m/s" 통일 형식 */}
                    <div className="flex items-center gap-2 text-sm">
                      <Wind className="w-4 h-4 text-[#F1C40F]" />
                      <span className="text-muted-foreground">바람</span>
                      <span className="font-medium ml-auto flex items-center gap-1">
                        {windType && (
                          <span className="text-xs font-bold" style={{ color: getWindTypeColor(windType) }}>
                            {getWindTypeLabel(windType)}
                          </span>
                        )}
                        {forecast.windDirection && (
                          <>
                            {windType && <span className="text-muted-foreground">·</span>}
                            <span>{degToCompassKo(Number(forecast.windDirection))} ({Number(forecast.windDirection).toFixed(0)}°)</span>
                          </>
                        )}
                        {forecast.windSpeed && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span>{formatWindSpeed(forecast.windSpeed)}</span>
                          </>
                        )}
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
          </>
        )}

        {/* Phase 2: SpotVote(👍👎 컨디션 투표) 제거 — 다이어리 별점과 의미 중복.
         *  다이어리 작성 시 매기는 별점이 더 풍부한 정보 제공.
         */}

        {/* ====== 서핑 기록 탭 - 스팟별 공개 다이어리 피드 ====== */}
        {activeTab === 'diary' && (
          <div className="space-y-3">
            {/* 헤더 - 총 기록 수 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">서핑 기록</span>
                {diaryTotal > 0 && (
                  <span className="text-xs text-muted-foreground">
                    총 <span className="text-primary font-bold">{diaryTotal}</span>개
                  </span>
                )}
              </div>
            </div>

            {/* 로딩 스켈레톤 */}
            {diaryLoading && publicDiaries.length === 0 && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-secondary rounded-full" />
                      <div className="flex-1">
                        <div className="h-3 bg-secondary rounded w-20 mb-1" />
                        <div className="h-2.5 bg-secondary rounded w-32" />
                      </div>
                    </div>
                    <div className="h-3 bg-secondary rounded w-40" />
                  </div>
                ))}
              </div>
            )}

            {/* 공개 다이어리 카드 목록 */}
            {publicDiaries.length > 0 && (
              <>
                {publicDiaries.map(entry => {
                  const sat = DIARY_SAT_CONFIG[entry.satisfaction] || DIARY_SAT_CONFIG[3];
                  const board = DIARY_BOARD_CONFIG[entry.boardType] || DIARY_BOARD_CONFIG['LONGBOARD'];
                  /** 날짜 포맷: "3월 14일" */
                  const d = new Date(entry.surfDate + 'T00:00:00');
                  const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일`;
                  /** 서핑 시간 포맷 */
                  const durStr = entry.durationMinutes >= 60
                    ? `${Math.floor(entry.durationMinutes / 60)}시간${entry.durationMinutes % 60 > 0 ? ` ${entry.durationMinutes % 60}분` : ''}`
                    : `${entry.durationMinutes}분`;

                  return (
                    <div
                      key={entry.id}
                      className="bg-card border border-border rounded-xl overflow-hidden
                                 hover:border-primary/20 transition-all"
                    >
                      {/* 만족도 색상 상단 바 */}
                      <div className="h-0.5" style={{ backgroundColor: sat.color }} />

                      <div className="p-3.5">
                        {/* 상단: 작성자 + 날짜 + 보드 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {/* 작성자 아바타 (없으면 닉네임 첫 글자) */}
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xs font-bold">
                              {entry.user.avatarUrl ? (
                                <img src={entry.user.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                              ) : (
                                (entry.user.username || '?').charAt(0)
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-bold">{entry.user.username || '알 수 없음'}</span>
                              {/* 날짜 + 시작 시간 */}
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span>{dateStr}</span>
                                {entry.surfTime && (
                                  <span className="flex items-center gap-0.5 text-orange-400">
                                    <Sunrise className="w-2.5 h-2.5" />
                                    {entry.surfTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* 만족도 이모지 + 보드 배지 + 신고 버튼 */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg" title={sat.label}>{sat.emoji}</span>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ backgroundColor: `${board.color}18`, color: board.color }}
                            >
                              {board.emoji} {board.label}
                            </span>
                            {/**
                             * 다이어리 신고 버튼 (Phase 2D)
                             * - 본인 다이어리에는 표시 X (시나리오 F-2)
                             * - 비로그인 시에도 표시 X (currentUserId=null)
                             */}
                            {currentUserId && entry.user.id !== currentUserId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReportTargetId(entry.id);
                                }}
                                className="ml-0.5 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="신고하기"
                                aria-label="신고하기"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 중앙: 파도 데이터 칩 (forecast 자동 매칭 데이터) */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {/* 서핑 시간 */}
                          <div className="flex items-center gap-1 text-[10px] bg-secondary/70 px-1.5 py-0.5 rounded">
                            <Clock className="w-2.5 h-2.5 text-blue-400" />
                            <span className="font-medium">{durStr}</span>
                          </div>
                          {/* 파고 - 자동 매칭 데이터 */}
                          {entry.waveHeight && (
                            <div className="flex items-center gap-1 text-[10px] bg-cyan-500/10 px-1.5 py-0.5 rounded">
                              <Waves className="w-2.5 h-2.5 text-cyan-400" />
                              <span className="font-medium text-cyan-300">{Number(entry.waveHeight).toFixed(1)}m</span>
                            </div>
                          )}
                          {/* 파도 주기 */}
                          {entry.wavePeriod && (
                            <div className="flex items-center gap-1 text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded">
                              <span className="text-blue-400 text-[9px]">T</span>
                              <span className="font-medium text-blue-300">{Number(entry.wavePeriod).toFixed(1)}s</span>
                            </div>
                          )}
                          {/* 풍속 - 서핑 표준 m/s 표시 */}
                          {entry.windSpeed && (
                            <div className="flex items-center gap-1 text-[10px] bg-green-500/10 px-1.5 py-0.5 rounded">
                              <Wind className="w-2.5 h-2.5 text-green-400" />
                              <span className="font-medium text-green-300">{formatWindSpeed(entry.windSpeed)}</span>
                            </div>
                          )}
                          {/* 만족도 별점 */}
                          <div className="flex gap-0.5 ml-auto">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star
                                key={s}
                                className={`w-2.5 h-2.5 ${s <= entry.satisfaction ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/20'}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 메모 (있으면 표시) */}
                        {entry.memo && (
                          <div className="relative mb-2">
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-primary/30" />
                            <p className="text-[11px] text-muted-foreground line-clamp-2 pl-2.5 italic leading-relaxed">
                              "{entry.memo}"
                            </p>
                          </div>
                        )}

                        {/* 도움됐어요 + 댓글 (Phase 2C) */}
                        <DiaryInteractions diaryId={entry.id} />
                      </div>
                    </div>
                  );
                })}

                {/* 더보기 버튼 */}
                {diaryHasMore && (
                  <button
                    onClick={() => fetchPublicDiaries(diaryPage + 1, true)}
                    disabled={diaryLoading}
                    className="w-full py-3 text-sm text-primary font-medium bg-primary/5 rounded-xl
                               hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5
                               disabled:opacity-50"
                  >
                    {diaryLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    더보기
                  </button>
                )}
              </>
            )}

            {/* 빈 상태 - 기록이 없을 때 */}
            {!diaryLoading && publicDiaries.length === 0 && (
              <div className="text-center py-12">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl">📖</span>
                  </div>
                </div>
                <h3 className="text-sm font-bold mb-1">아직 공유된 서핑 기록이 없어요</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  이 스팟에서 서핑한 후<br />
                  다이어리를 "전체 공개"로 작성해보세요!
                </p>
              </div>
            )}
          </div>
        )}

        {/* 예보 없음 */}
        {!forecast && activeTab === 'wave' && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">예보 데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/**
       * 다이어리 신고 모달 (Phase 2D)
       * - 다이어리 카드의 🚩 버튼 클릭 시 reportTargetId 세팅 → 모달 오픈
       */}
      {reportTargetId && (
        <ReportModal
          open={true}
          onClose={() => setReportTargetId(null)}
          targetType="diary"
          targetId={reportTargetId}
        />
      )}
    </div>
  );
}
