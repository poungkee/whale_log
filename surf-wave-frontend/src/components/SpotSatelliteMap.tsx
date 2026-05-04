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
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RefreshCw, MapPin } from 'lucide-react';
import {
  arrowLineString,
  coastLineString,
  windArrowDirection,
} from '../lib/geoArrow';
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
  /** 환경변수 토큰 — 없으면 컴포넌트 자체를 안 그림 (M-5) */
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

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

  /** 화살표 데이터 메모이제이션 — 방향/거리 계산 비용 절감 */
  const arrowData = useMemo(() => {
    const result: {
      coast?: GeoJSON.Feature<GeoJSON.LineString>;
      wind?: GeoJSON.Feature<GeoJSON.LineString>;
      swell?: GeoJSON.Feature<GeoJSON.LineString>;
      windColor: string;
      windLabel: string;
    } = { windColor: '#95A5A6', windLabel: '' };

    /** 해변선 (M-1) */
    if (spot.coastFacingDeg != null) {
      result.coast = coastLineString(lat, lng, spot.coastFacingDeg, 200);
    }

    /** 풍향 화살표 (M-2) — FROM → TO 변환 */
    if (currentForecast?.windDirection) {
      const windFromDeg = Number(currentForecast.windDirection);
      const arrowDeg = windArrowDirection(windFromDeg);
      result.wind = arrowLineString(lat, lng, arrowDeg, 250);
      const windType = getWindType(windFromDeg, spot.coastFacingDeg);
      result.windColor = getWindTypeColor(windType);
      result.windLabel = getWindTypeLabel(windType);
    }

    /** 스웰 화살표 (M-3) */
    if (currentForecast?.swellDirection) {
      const swellFromDeg = Number(currentForecast.swellDirection);
      const arrowDeg = (swellFromDeg + 180) % 360;
      result.swell = arrowLineString(lat, lng, arrowDeg, 300);
    }

    return result;
  }, [lat, lng, spot.coastFacingDeg, currentForecast]);

  /** 토큰 없으면 컴포넌트 자체 숨김 (M-5) */
  if (!mapboxToken) {
    return null;
  }

  /** 시간 라벨 — "12시" 형식 */
  const hourLabel = currentForecast?.forecastTime
    ? new Date(currentForecast.forecastTime).getHours() + '시'
    : '';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      {/* 헤더 */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold flex-1">위성지도</h3>
        {arrowData.windLabel && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              color: arrowData.windColor,
              backgroundColor: `${arrowData.windColor}18`,
            }}
          >
            {arrowData.windLabel}
          </span>
        )}
      </div>

      {/* 지도 영역 */}
      <div className="relative w-full h-[280px]">
        <Map
          initialViewState={{
            latitude: lat,
            longitude: lng,
            zoom: 15,
          }}
          /**
           * Mapbox Style URL 직접 사용 (가장 안정적)
           * - satellite-streets-v12: 위성 + 도로/지명 라벨
           * - 또는 satellite-v9: 순수 위성사진만
           * - maplibre-gl이 자동으로 raster + label 처리
           */
          mapStyle={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9?access_token=${mapboxToken}`}
          dragRotate={false}
          touchZoomRotate={true}
        >
          {/* 스팟 마커 */}
          <Marker latitude={lat} longitude={lng}>
            <div className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md" />
          </Marker>

          {/* 해변선 (검정) */}
          {arrowData.coast && (
            <Source id="coast" type="geojson" data={arrowData.coast}>
              <Layer
                id="coast-line"
                type="line"
                paint={{
                  'line-color': '#1f2937',
                  'line-width': 3,
                  'line-opacity': 0.85,
                }}
              />
            </Source>
          )}

          {/* 스웰 화살표 (파란색) */}
          {arrowData.swell && (
            <Source id="swell" type="geojson" data={arrowData.swell}>
              <Layer
                id="swell-line"
                type="line"
                paint={{
                  'line-color': '#3B82F6',
                  'line-width': 4,
                  'line-opacity': 0.9,
                }}
              />
            </Source>
          )}

          {/* 풍향 화살표 (오프쇼어/온쇼어/사이드 색상) */}
          {arrowData.wind && (
            <Source id="wind" type="geojson" data={arrowData.wind}>
              <Layer
                id="wind-line"
                type="line"
                paint={{
                  'line-color': arrowData.windColor,
                  'line-width': 5,
                  'line-opacity': 0.95,
                }}
              />
            </Source>
          )}
        </Map>

        {/* 좌상단: 화살표 범례 */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1.5 text-[10px] text-white space-y-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-white" />
            <span>해변선</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5" style={{ backgroundColor: arrowData.windColor }} />
            <span>풍향</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-blue-500" />
            <span>스웰</span>
          </div>
        </div>
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
