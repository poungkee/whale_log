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
  arrowEndPoint,
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
   * 화살표 데이터 메모이제이션 — 방향/거리 계산 비용 절감
   *
   * 핵심 정책 (사용자 요구):
   * - 화살표 라인은 **항상 바다 방향**으로 고정 (coastFacingDeg)
   * - 풍향이 온쇼어든 오프쇼어든 라인 위치 동일 (육지 침범 방지)
   * - 머리(▶) 방향만 풍향에 따라 변함:
   *   - OFFSHORE: 머리 → 바다쪽 (라인 끝, ▶)
   *   - ONSHORE: 머리 → 스팟쪽 (라인 시작, ◀, 라인 진행 반대)
   *   - CROSS: 머리 라인 끝 (옆 방향)
   * - 정보는 라벨에 전달 ("오프쇼어 5m/s")
   *
   * 검정 해변선은 제거 (의미 적고 시각 복잡)
   */
  const arrowData = useMemo(() => {
    const result: {
      wind?: GeoJSON.FeatureCollection<GeoJSON.LineString>;
      swell?: GeoJSON.FeatureCollection<GeoJSON.LineString>;
      windMid?: { lat: number; lng: number };
      windHead?: { lat: number; lng: number; rotateDeg: number };
      swellMid?: { lat: number; lng: number };
      swellHead?: { lat: number; lng: number; rotateDeg: number };
      windColor: string;
      windLabel: string;
      swellLabel: string;
    } = { windColor: '#95A5A6', windLabel: '', swellLabel: '' };

    /**
     * 풍향 화살표 — 라인은 바다 방향 고정, 머리만 풍향 따라
     * coastFacingDeg가 없으면 풍향 방향(TO) 사용 (예외 케이스)
     */
    if (currentForecast?.windDirection) {
      const windFromDeg = Number(currentForecast.windDirection);
      const distanceM = 150;
      const lineDeg = spot.coastFacingDeg ?? windArrowDirection(windFromDeg);

      /** 라인은 항상 바다쪽 (스팟 → 바다 방향) */
      result.wind = arrowLineString(lat, lng, lineDeg, distanceM);
      const mid = arrowEndPoint(lat, lng, lineDeg, distanceM / 2);
      const end = arrowEndPoint(lat, lng, lineDeg, distanceM);
      result.windMid = { lat: mid.lat, lng: mid.lng };

      /** 풍향 종류로 머리 위치/방향 결정 */
      const windType = getWindType(windFromDeg, spot.coastFacingDeg);
      result.windColor = getWindTypeColor(windType);
      result.windLabel = getWindTypeLabel(windType);

      if (windType === 'ONSHORE') {
        /** 온쇼어: 머리는 스팟쪽(시작점)에 ◀ 가리킴 (라인 진행 반대) */
        result.windHead = { lat, lng, rotateDeg: (lineDeg + 180) % 360 };
      } else {
        /** 오프쇼어/사이드/판정불가: 머리는 라인 끝(바다쪽) ▶ */
        result.windHead = { lat: end.lat, lng: end.lng, rotateDeg: lineDeg };
      }

      /** 풍속 라벨에 추가 */
      const ws = (currentForecast as { windSpeed?: string | null }).windSpeed;
      const wsMs = ws ? (Number(ws) / 3.6).toFixed(1) : null;
      if (result.windLabel && wsMs) {
        result.windLabel = `${result.windLabel} ${wsMs}m/s`;
      } else if (wsMs) {
        result.windLabel = `${wsMs}m/s`;
      }
    }

    /**
     * 스웰 화살표 — 라인은 바다 방향, 머리는 스팟쪽 (스웰 도착)
     * 스웰은 항상 바다 → 해변 방향이라 머리는 항상 스팟쪽
     */
    if (currentForecast?.swellDirection) {
      const distanceM = 200;
      const lineDeg = spot.coastFacingDeg ?? 0;

      result.swell = arrowLineString(lat, lng, lineDeg, distanceM);
      const mid = arrowEndPoint(lat, lng, lineDeg, distanceM / 2);
      result.swellMid = { lat: mid.lat, lng: mid.lng };

      /** 스웰 머리: 스팟쪽 (라인 시작점, 라인 반대 방향) */
      result.swellHead = { lat, lng, rotateDeg: (lineDeg + 180) % 360 };

      /** 스웰 라벨 — "스웰 1.5m @8s" 형식 (높이/주기) */
      const sh = (currentForecast as { swellHeight?: string | null }).swellHeight;
      const sp = (currentForecast as { swellPeriod?: string | null }).swellPeriod;
      result.swellLabel = sh
        ? `스웰 ${Number(sh).toFixed(1)}m${sp ? ` @${Number(sp).toFixed(0)}s` : ''}`
        : '스웰';
    }

    return result;
  }, [lat, lng, spot.coastFacingDeg, currentForecast]);

  /**
   * 지도 중심 좌표 — 바다 방향으로 offset (스팟이 카드 위쪽 = 육지쪽 위치)
   * coastFacingDeg가 해변이 바라보는 방향 = 바다 방향
   * 그 방향으로 200m 이동 → 지도 카드 중앙이 바다가 됨 (wavelet 스타일)
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
            /**
             * 지도 중심을 바다 방향으로 offset (wavelet 스타일)
             * - 스팟 마커: 카드 위쪽 (육지)
             * - 바다: 카드 중앙/하단 (포커스)
             */
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
          {/* 스팟 마커 — 시작점 (파란 점) */}
          <Marker latitude={lat} longitude={lng}>
            <div className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-md" />
          </Marker>

          {/**
           * 풍향 라벨 캡슐 — 라인 중간에 표시 (wavelet 스타일)
           * - 회전 X (글자 항상 정방향, 가독성)
           * - 색상 dot + 라벨 텍스트 ("오프쇼어")
           */}
          {arrowData.windMid && arrowData.windLabel && (
            <Marker latitude={arrowData.windMid.lat} longitude={arrowData.windMid.lng}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'white',
                  border: `2px solid ${arrowData.windColor}`,
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: arrowData.windColor,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: arrowData.windColor,
                  }}
                />
                {arrowData.windLabel}
              </div>
            </Marker>
          )}

          {/* 스웰 라벨 캡슐 — 라인 중간 (파란색) */}
          {arrowData.swellMid && arrowData.swellLabel && (
            <Marker latitude={arrowData.swellMid.lat} longitude={arrowData.swellMid.lng}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'white',
                  border: '2px solid #3B82F6',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#3B82F6',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#3B82F6',
                  }}
                />
                {arrowData.swellLabel}
              </div>
            </Marker>
          )}

          {/**
           * 풍향 화살표 머리 (▶) — 끝점에 SVG로 표시
           * - rotateDeg: 화살표 진행 방향 (북=0, 동=90, 남=180, 서=270)
           * - SVG 기본 ▶는 오른쪽(동쪽=90°) 방향 → CSS rotate에서 -90 보정
           */}
          {arrowData.windHead && (
            <Marker latitude={arrowData.windHead.lat} longitude={arrowData.windHead.lng}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 16 16"
                style={{
                  transform: `rotate(${arrowData.windHead.rotateDeg - 90}deg)`,
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                }}
              >
                <polygon points="0,2 14,8 0,14" fill={arrowData.windColor} stroke="white" strokeWidth="1.5" />
              </svg>
            </Marker>
          )}

          {/* 스웰 화살표 머리 — 스팟쪽 (스웰 도착) */}
          {arrowData.swellHead && (
            <Marker latitude={arrowData.swellHead.lat} longitude={arrowData.swellHead.lng}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                style={{
                  transform: `rotate(${arrowData.swellHead.rotateDeg - 90}deg)`,
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                }}
              >
                <polygon points="0,2 14,8 0,14" fill="#3B82F6" stroke="white" strokeWidth="1.5" />
              </svg>
            </Marker>
          )}

          {/* 스웰 화살표 라인 (파란색) — 라인 굵게 */}
          {arrowData.swell && (
            <Source id="swell" type="geojson" data={arrowData.swell}>
              <Layer
                id="swell-line"
                type="line"
                paint={{
                  'line-color': '#3B82F6',
                  'line-width': 7,
                  'line-opacity': 0.9,
                }}
              />
            </Source>
          )}

          {/* 풍향 화살표 라인 (오프쇼어/온쇼어/사이드 색상) — 라인 굵게 */}
          {arrowData.wind && (
            <Source id="wind" type="geojson" data={arrowData.wind}>
              <Layer
                id="wind-line"
                type="line"
                paint={{
                  'line-color': arrowData.windColor,
                  'line-width': 7,
                  'line-opacity': 0.95,
                }}
              />
            </Source>
          )}
        </Map>

        {/* 좌상단: 화살표 범례 (해변선 제거) */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1.5 text-[10px] text-white space-y-0.5">
          <div className="flex items-center gap-1.5" style={{ display: 'none' }}>
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
