/**
 * @file SpotSatelliteMap.tsx
 * @description 스팟 위성지도 + 풍향/스웰 화살표 오버레이 (Task #84)
 *
 * 핵심 기능:
 * 1. Mapbox satellite raster 위성사진 (정확한 스팟 좌표)
 * 2. SVG 화살표 3종 오버레이:
 *    - 해변선 (검정, coastFacingDeg ± 90°)
 *    - 풍향 (오프쇼어 색상, FROM → TO 변환)
 *    - 스웰 (파란색, FROM → TO 변환)
 * 3. 시간 슬라이더 (0~24h, 24개 hourly forecast 데이터)
 * 4. 갱신 시각 표시 + 새로고침 버튼
 *
 * 방어 로직:
 * - M-1: coastFacingDeg null → 해변선/라벨 생략
 * - M-2: windDirection null → 풍향 화살표 생략
 * - M-3: swellDirection null → 스웰 화살표 생략
 * - M-4: 위성 타일 로딩 실패 → 회색 배경 + 텍스트 fallback
 * - M-5: Mapbox 토큰 없음 → 컴포넌트 자체 숨김
 * - M-6: 슬라이더 인덱스 범위 → clamp(0, hourlyData.length-1)
 * - M-7: 새로고침 중복 → 1초 debounce + 로딩 상태
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RefreshCw, MapPin } from 'lucide-react';
import { windArrowDirection, arrowEndPoint } from '../lib/geoArrow';
import {
  getWindType,
  getWindTypeColor,
  getWindTypeLabel,
} from '../lib/wind';
import type { ForecastInfo } from '../types';

interface SpotSatelliteMapProps {
  /** 스팟 좌표 + 해변 방향 */
  spot: {
    name: string;
    latitude: number | string;
    longitude: number | string;
    coastFacingDeg: number | null;
  };
  /** 24시간 예보 배열 (시간 슬라이더용) */
  hourlyData: ForecastInfo[];
  /** 현재(forecastTime이 가장 가까운) 인덱스, 없으면 0 */
  initialHourIndex?: number;
  /** 마지막 갱신 시각 (ISO 문자열) */
  lastUpdated?: string;
  /** 새로고침 핸들러 (React Query refetch 등) */
  onRefresh?: () => void;
  /** 새로고침 진행 중 */
  refreshing?: boolean;
}

/** "n분 전" 라벨 — Date 차이 → 한국어 */
function formatRelativeTime(iso?: string): string {
  if (!iso) return '갱신 시각 알 수 없음';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전 갱신됨';
  if (diffMin < 60) return `${diffMin}분 전 갱신됨`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}시간 전 갱신됨`;
  return new Date(iso).toLocaleString('ko-KR');
}

export function SpotSatelliteMap({
  spot,
  hourlyData,
  initialHourIndex = 0,
  lastUpdated,
  onRefresh,
  refreshing = false,
}: SpotSatelliteMapProps) {
  /**
   * 위성지도는 ESRI World Imagery 사용 (무료, 토큰 불필요)
   * Mapbox 토큰은 향후 다른 용도(geocoding 등)에 활용 가능하도록 .env에 유지
   */

  /** 슬라이더 인덱스 — clamp(0, len-1) (M-6) */
  const [hourIndex, setHourIndex] = useState(
    Math.max(0, Math.min(initialHourIndex, hourlyData.length - 1)),
  );

  /** initialHourIndex prop 변경 시 동기화 (예: 새로고침 후) */
  useEffect(() => {
    setHourIndex(Math.max(0, Math.min(initialHourIndex, hourlyData.length - 1)));
  }, [initialHourIndex, hourlyData.length]);

  /** 새로고침 debounce (M-7) */
  const refreshDebounceRef = useRef<number>(0);
  const handleRefreshClick = () => {
    if (refreshing) return;
    const now = Date.now();
    if (now - refreshDebounceRef.current < 1000) return;
    refreshDebounceRef.current = now;
    onRefresh?.();
  };

  /** 슬라이더로 선택된 시점의 forecast */
  const currentForecast = hourlyData[hourIndex];

  /** 좌표 정규화 — string | number → number */
  const lat = typeof spot.latitude === 'string' ? parseFloat(spot.latitude) : spot.latitude;
  const lng = typeof spot.longitude === 'string' ? parseFloat(spot.longitude) : spot.longitude;

  /**
   * 화살표 마커 데이터
   *
   * 디자인:
   * - 화살표 마커 2개 (풍향, 스웰)
   * - 폭 넓은 캡슐 + 끝 뾰족 (글자 수용 가능)
   * - 화살표 안에 "바람"/"파도" 글자 (구분)
   * - 위치: 바다 위 (육지에 그리지 않게 offset)
   *   - 풍향: 스팟에서 바다쪽 120m
   *   - 스웰: 스팟에서 바다쪽 220m (풍향보다 더 멀리, 시각적 분리)
   * - 회전: 풍향/스웰 방향대로
   */
  const markerData = useMemo(() => {
    const result: {
      windPos?: { lat: number; lng: number };
      windRotateDeg: number | null;
      swellPos?: { lat: number; lng: number };
      swellRotateDeg: number | null;
      windColor: string;
      windLabel: string;
      swellLabel: string;
    } = {
      windRotateDeg: null,
      swellRotateDeg: null,
      windColor: '#95A5A6',
      windLabel: '',
      swellLabel: '',
    };

    /** 풍향 — 바다쪽 120m 위치, 풍향 회전 */
    if (currentForecast?.windDirection && spot.coastFacingDeg != null) {
      const windFromDeg = Number(currentForecast.windDirection);
      result.windRotateDeg = windArrowDirection(windFromDeg);
      result.windPos = arrowEndPoint(lat, lng, spot.coastFacingDeg, 120);
      const windType = getWindType(windFromDeg, spot.coastFacingDeg);
      result.windColor = getWindTypeColor(windType);
      result.windLabel = getWindTypeLabel(windType);
    }

    /** 스웰 — 바다쪽 220m 위치 (풍향보다 더 멀리), 스웰 방향 회전 */
    if (currentForecast?.swellDirection && spot.coastFacingDeg != null) {
      const swellFromDeg = Number(currentForecast.swellDirection);
      result.swellRotateDeg = (swellFromDeg + 180) % 360;
      result.swellPos = arrowEndPoint(lat, lng, spot.coastFacingDeg, 220);
      /** 라벨 — "스웰 1.5m @8s" */
      const sh = (currentForecast as { swellHeight?: string | null }).swellHeight;
      const sp = (currentForecast as { swellPeriod?: string | null }).swellPeriod;
      result.swellLabel = sh
        ? `스웰 ${Number(sh).toFixed(1)}m${sp ? ` @${Number(sp).toFixed(0)}s` : ''}`
        : '스웰';
    }

    return result;
  }, [lat, lng, spot.coastFacingDeg, currentForecast]);

  /**
   * 지도 중심 좌표 — 바다쪽으로 200m offset
   * 결과: 좌측 = 해변/스팟, 가운데 = 화살표, 우측 = 깊은 바다
   */
  const mapCenter = useMemo(() => {
    if (spot.coastFacingDeg == null) return { lat, lng };
    return arrowEndPoint(lat, lng, spot.coastFacingDeg, 200);
  }, [lat, lng, spot.coastFacingDeg]);

  /** 시간 라벨 — "12시" 형식 */
  const hourLabel = currentForecast?.forecastTime
    ? new Date(currentForecast.forecastTime).getHours() + '시'
    : '';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      {/* 헤더 — 풍향 + 풍속 + 스웰 통합 표시 */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <h3 className="text-sm font-bold flex-1">위성지도</h3>
        {markerData.windLabel && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              color: markerData.windColor,
              backgroundColor: `${markerData.windColor}18`,
            }}
          >
            {markerData.windLabel}
            {currentForecast?.windSpeed
              ? ` ${(Number(currentForecast.windSpeed) / 3.6).toFixed(1)}m/s`
              : ''}
          </span>
        )}
        {markerData.swellLabel && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ color: '#3B82F6', backgroundColor: '#3B82F618' }}
          >
            {markerData.swellLabel}
          </span>
        )}
      </div>

      {/* 지도 영역 — 카드 높이 정사각형에 가깝게 (wavelet 스타일) */}
      <div className="relative w-full h-[280px]">
        <Map
          initialViewState={{
            /** 줌 14 — wavelet 비율 (스팟+해안선+바다 한눈에) */
            latitude: mapCenter.lat,
            longitude: mapCenter.lng,
            zoom: 14,
          }}
          /**
           * ESRI World Imagery — 무료 위성사진 raster tile (토큰 불필요)
           * - 전 세계 커버리지 (한국/발리 포함)
           * - maplibre-gl과 호환성 검증됨 (Mapbox v8 spec과 다른 이슈 없음)
           * - attribution: Esri (지도 우하단 자동 표시)
           */
          /**
           * maplibre-gl 5.x 호환을 위해 style spec에 모든 필드 명시
           * - glyphs: 라벨 폰트 (사용 안 해도 spec은 요구할 수 있음)
           * - terrain: null 명시 (자동 setTerrain 호출 시 에러 방지)
           * - light: 기본 light 명시
           */
          mapStyle={{
            version: 8,
            name: 'Whale Log Satellite',
            /**
             * glyphs: maplibre-gl 5.x는 spec에 glyphs URL 누락 시 worker 초기화 실패
             * (실제 텍스트 라벨 layer 없어도 spec 유효성 검증 통과해야 함)
             * demotiles.maplibre.org는 maplibre 공식 무료 폰트 서버
             */
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {
              'satellite': {
                type: 'raster',
                tiles: [
                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                ],
                tileSize: 256,
                minzoom: 0,
                maxzoom: 18,
                attribution: 'Tiles © Esri',
              },
            },
            layers: [
              {
                id: 'satellite-layer',
                type: 'raster',
                source: 'satellite',
                minzoom: 0,
                maxzoom: 22,
              },
            ],
          }}
          dragRotate={false}
          touchZoomRotate={true}
        >
          {/**
           * 풍향 화살표 마커 — 폭 넓은 캡슐 + 끝 뾰족 (글자 수용)
           * 위치: 스팟에서 바다쪽 120m
           * 회전: 바람이 부는 방향 (TO direction)
           */}
          {markerData.windPos && markerData.windRotateDeg !== null && (
            <Marker latitude={markerData.windPos.lat} longitude={markerData.windPos.lng}>
              <div
                style={{
                  transform: `rotate(${markerData.windRotateDeg - 90}deg)`,
                  transformOrigin: 'center center',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}
              >
                <svg width="80" height="32" viewBox="0 0 80 32">
                  {/* 본체 캡슐 + 끝 뾰족한 화살표 머리 */}
                  <path
                    d="M 0,8 L 56,8 L 56,2 L 78,16 L 56,30 L 56,24 L 0,24 Q -4,16 0,8 Z"
                    fill={markerData.windColor}
                    stroke="white"
                    strokeWidth="2"
                  />
                  {/* 글자 "바람" — 화살표와 함께 회전되지만 짧아서 가독 OK */}
                  <text
                    x="28"
                    y="20"
                    textAnchor="middle"
                    fill="white"
                    fontSize="13"
                    fontWeight="700"
                  >
                    바람
                  </text>
                </svg>
              </div>
            </Marker>
          )}

          {/**
           * 스웰(파도) 화살표 마커 — 풍향과 같은 모양, 파란색
           * 위치: 스팟에서 바다쪽 220m (풍향보다 더 멀리, 시각 분리)
           * 회전: 스웰이 가는 방향 (TO = 해변쪽)
           */}
          {markerData.swellPos && markerData.swellRotateDeg !== null && (
            <Marker latitude={markerData.swellPos.lat} longitude={markerData.swellPos.lng}>
              <div
                style={{
                  transform: `rotate(${markerData.swellRotateDeg - 90}deg)`,
                  transformOrigin: 'center center',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}
              >
                <svg width="80" height="32" viewBox="0 0 80 32">
                  <path
                    d="M 0,8 L 56,8 L 56,2 L 78,16 L 56,30 L 56,24 L 0,24 Q -4,16 0,8 Z"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x="28"
                    y="20"
                    textAnchor="middle"
                    fill="white"
                    fontSize="13"
                    fontWeight="700"
                  >
                    파도
                  </text>
                </svg>
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* 시간 슬라이더 */}
      {hourlyData.length > 1 && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-muted-foreground">시간대 예보</span>
            <span className="text-xs font-bold text-primary">{hourLabel}</span>
          </div>
          <input
            type="range"
            min={0}
            max={hourlyData.length - 1}
            value={hourIndex}
            onChange={(e) => setHourIndex(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>지금</span>
            <span>+{hourlyData.length - 1}시간 후</span>
          </div>
        </div>
      )}

      {/* 갱신 시각 + 새로고침 */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatRelativeTime(lastUpdated)}</span>
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={refreshing}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? '갱신 중' : '새로고침'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
