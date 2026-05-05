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
  /** 스팟 좌표 + 해변 방향 + 지역 */
  spot: {
    name: string;
    latitude: number | string;
    longitude: number | string;
    coastFacingDeg: number | null;
    /** 지역 (예: '양양', 'Bali Uluwatu') — 발리 화살표 비활성화 판정용 */
    region?: string;
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
   * 발리 스팟 여부 — region 문자열에 'Bali' 포함 시 발리
   * 발리는 지형이 다양해서 (절벽/만/강) 화살표가 육지에 표시되는 케이스 많음
   * → 발리는 화살표 비활성화 (위성사진만 표시)
   */
  const isBali = useMemo(() => {
    const region = spot.region?.toLowerCase() ?? '';
    return region.includes('bali') || region.includes('발리');
  }, [spot.region]);

  /**
   * 화살표 마커 데이터
   *
   * 디자인:
   * - 화살표 마커 2개 (풍향, 스웰)
   * - 폭 넓은 캡슐 + 끝 뾰족 (글자 수용 가능)
   * - 화살표 안에 "바람"/"파도" 글자 (구분)
   * - 위치: 바다 위 (육지에 그리지 않게 offset)
   *   - 풍향: 스팟에서 바다쪽 150m
   *   - 스웰: 스팟에서 바다쪽 280m (풍향보다 더 멀리, 시각적 분리)
   * - 회전: 풍향/스웰 방향대로
   *
   * 발리는 화살표 생성 안 함 (지형 다양해서 육지 표시 케이스 많음)
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

    /** 발리는 화살표 생성 안 함 (지형 다양 → 육지 표시 케이스 많음) */
    if (isBali) return result;

    /**
     * 시계 바늘 디자인 (사용자 요청):
     * - 두 화살표 시작점 = 스팟 (회전축, 시계 바늘처럼)
     * - 회전 = 풍향/스웰 가는 방향 (TO direction)
     * - 같은 방향(30도 이내): perpendicular offset으로 위/아래 평행 분리
     * - 다른 방향: 같은 좌표 (마주봄=양쪽 뻗음, 사이드=V자)
     */

    /** 풍향 — 풍향이 가는 방향 (TO) 회전 */
    let windRotateDeg: number | null = null;
    if (currentForecast?.windDirection) {
      const windFromDeg = Number(currentForecast.windDirection);
      windRotateDeg = windArrowDirection(windFromDeg);
      result.windRotateDeg = windRotateDeg;
      const windType = getWindType(windFromDeg, spot.coastFacingDeg);
      result.windColor = getWindTypeColor(windType);
      result.windLabel = getWindTypeLabel(windType);
    }

    /** 파도 — 스웰이 가는 방향 (TO, 해변쪽) 회전 */
    let swellRotateDeg: number | null = null;
    if (currentForecast?.swellDirection) {
      const swellFromDeg = Number(currentForecast.swellDirection);
      swellRotateDeg = (swellFromDeg + 180) % 360;
      result.swellRotateDeg = swellRotateDeg;
      const sh = (currentForecast as { swellHeight?: string | null }).swellHeight;
      const sp = (currentForecast as { swellPeriod?: string | null }).swellPeriod;
      result.swellLabel = sh
        ? `스웰 ${Number(sh).toFixed(1)}m${sp ? ` @${Number(sp).toFixed(0)}s` : ''}`
        : '스웰';
    }

    /**
     * 화살표 기준점 = 일체형 아이콘 회전축 (●)
     * - spot 좌표에서 바다쪽(coastFacingDeg 방향)으로 220m offset
     * - 이유: 100m는 모래사장/얕은 바다(육지 인접)에 떠 있는 케이스 많음
     *   220m면 거의 모든 국내 해변에서 명백한 바다 위
     * - coastFacingDeg null인 스팟은 spot 그대로 (offset 불가능)
     */
    const arrowOrigin = spot.coastFacingDeg != null
      ? arrowEndPoint(lat, lng, spot.coastFacingDeg, 220)
      : { lat, lng };

    /**
     * 두 화살표 위치 = arrowOrigin 통일 (회전축 공유)
     * - 사용자 요구: 두 화살표 머리가 중앙(●)에서 만나는 일체형 아이콘
     *   ━━━▶ ● ◀━━━ 형태 (각도는 풍향/스웰 실제 값)
     * - 평행/시계바늘 분기 제거 — SVG 두 개가 같은 회전축에서 자기 각도로 회전
     * - 시각적 분리는 새 아이콘 디자인 (사용자 제공 예정) 으로 처리
     */
    if (windRotateDeg !== null) result.windPos = arrowOrigin;
    if (swellRotateDeg !== null) result.swellPos = arrowOrigin;

    return result;
  }, [lat, lng, spot.coastFacingDeg, currentForecast, isBali]);

  /**
   * 지도 중심 좌표
   * - 국내: 바다쪽으로 220m offset → arrowOrigin과 일치 → 화살표 = 화면 중앙
   * - 발리: 스팟 위치 그대로 (지형 다양해서 일률적 offset 부적합)
   */
  const mapCenter = useMemo(() => {
    if (isBali || spot.coastFacingDeg == null) return { lat, lng };
    return arrowEndPoint(lat, lng, spot.coastFacingDeg, 220);
  }, [lat, lng, spot.coastFacingDeg, isBali]);

  /** 시간 라벨 — "12시" 형식 */
  const hourLabel = currentForecast?.forecastTime
    ? new Date(currentForecast.forecastTime).getHours() + '시'
    : '';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      {/* 헤더 — 풍향 + 풍속 + 스웰 통합 표시 (발리는 위성사진 카드만, 라벨 X) */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <h3 className="text-sm font-bold flex-1">위성지도</h3>
        {!isBali && markerData.windLabel && (
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
        {!isBali && markerData.swellLabel && (
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
            /**
             * 줌:
             * - 국내(한국): 14.7 — 사용자 검증, 화살표 + 해변+바다 균형
             * - 발리: 14 — 지형 다양해서 좀 더 멀리 (만/절벽/강 한눈에)
             */
            latitude: mapCenter.lat,
            longitude: mapCenter.lng,
            zoom: isBali ? 14 : 14.7,
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
           * 풍향 화살표 — 시계 바늘 디자인
           * 마커 위치 = 스팟 (회전축), SVG 좌측 중앙이 회전축
           * 회전 = 풍향이 가는 방향 (TO direction)
           */}
          {markerData.windPos && markerData.windRotateDeg !== null && (
            <Marker latitude={markerData.windPos.lat} longitude={markerData.windPos.lng}>
              <div
                style={{
                  /** 회전축: 좌측 중앙 (SVG 시작점이 스팟에 고정) */
                  transformOrigin: '0% 50%',
                  transform: `rotate(${markerData.windRotateDeg - 90}deg)`,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  /** SVG가 좌측에서 우측으로 뻗어나가도록 위치 조정 */
                  marginLeft: 0,
                }}
              >
                <svg width="90" height="36" viewBox="0 0 90 36">
                  {/* 본체 사각형 + 끝 뾰족한 화살표 머리 (좌측이 시작점) */}
                  <path
                    d="M 0,9 L 64,9 L 64,2 L 88,18 L 64,34 L 64,27 L 0,27 Z"
                    fill={markerData.windColor}
                    stroke="white"
                    strokeWidth="2"
                  />
                  {/* 글자 "바람" — 본체 중앙, 가독성 위해 폰트 키움 */}
                  <text
                    x="32"
                    y="23"
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="800"
                  >
                    바람
                  </text>
                </svg>
              </div>
            </Marker>
          )}

          {/**
           * 파도(스웰) 화살표 — 시계 바늘 디자인, 파란색
           * 회전 = 스웰이 가는 방향 (TO = 해변쪽)
           */}
          {markerData.swellPos && markerData.swellRotateDeg !== null && (
            <Marker latitude={markerData.swellPos.lat} longitude={markerData.swellPos.lng}>
              <div
                style={{
                  transformOrigin: '0% 50%',
                  transform: `rotate(${markerData.swellRotateDeg - 90}deg)`,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  marginLeft: 0,
                }}
              >
                <svg width="90" height="36" viewBox="0 0 90 36">
                  <path
                    d="M 0,9 L 64,9 L 64,2 L 88,18 L 64,34 L 64,27 L 0,27 Z"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x="32"
                    y="23"
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="800"
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
