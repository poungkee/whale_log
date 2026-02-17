/**
 * @file SpotMap.tsx
 * @description 스팟 지도 컴포넌트 - MapLibre GL + 클러스터링 + 하단 카드
 *
 * OpenFreeMap 타일 서버를 사용한 밝은 벡터 지도 위에
 * 서핑 스팟 마커를 클러스터링하여 표시합니다.
 *
 * 기능:
 * - 스팟 마커 (surfRating 색상 + 고점수 펄스)
 * - 클러스터 마커 (여러 스팟 그룹)
 * - 마커 클릭 시 하단 슬라이드 카드 표시
 * - 지역 퀵 이동 버튼 (국내/발리)
 * - 색상 범례 (점수 의미 표시)
 * - 전체 스팟 맞춤 줌 (초기 로딩 시)
 * - 줌/내 위치 컨트롤
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SpotForecast } from '../types';
import { useSpotClusters, type SpotFeature } from '../hooks/useSpotClusters';
import { useGeolocation } from '../hooks/useGeolocation';
import { SpotMarker } from './SpotMarker';
import { ClusterMarker } from './ClusterMarker';
import { SpotBottomCard } from './SpotBottomCard';
import { MapControls } from './MapControls';

/** OpenFreeMap 무료 벡터 타일 스타일 URL (밝은 테마) */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

/** 지역 퀵 이동 버튼 정의 */
const REGION_BUTTONS = [
  { key: 'all', label: '전체', center: [127.5, 20.0] as [number, number], zoom: 4 },
  { key: 'korea', label: '국내', center: [128.5, 36.5] as [number, number], zoom: 7 },
  { key: 'bali', label: '발리', center: [115.16, -8.65] as [number, number], zoom: 10 },
];

/** 색상 범례 데이터 */
const LEGEND_ITEMS = [
  { color: '#E74C3C', label: '나쁨' },
  { color: '#F39C12', label: '보통' },
  { color: '#2ECC71', label: '좋음' },
  { color: '#9B59B6', label: '최고' },
];

interface SpotMapProps {
  /** 표시할 스팟 예보 데이터 배열 */
  spots: SpotForecast[];
  /** 스팟 상세 보기 클릭 핸들러 */
  onSpotDetail: (sf: SpotForecast) => void;
}

/** 지도 바운드 타입 [서경, 남위, 동경, 북위] */
type Bounds = [number, number, number, number];

export function SpotMap({ spots, onSpotDetail }: SpotMapProps) {
  /** 지도 인스턴스 참조 */
  const mapRef = useRef<MapRef>(null);
  /** 최초 로드 시 자동 줌 적용 여부 */
  const didFitBounds = useRef(false);

  /** 현재 지도 뷰포트 상태 */
  const [viewState, setViewState] = useState({
    longitude: 128.5,
    latitude: 20.0,
    zoom: 4,
  });

  /** 현재 지도 바운드 (클러스터 계산용) */
  const [bounds, setBounds] = useState<Bounds | null>(null);

  /** 선택된 스팟 (하단 카드 표시용) */
  const [selectedSpot, setSelectedSpot] = useState<SpotForecast | null>(null);

  /** 활성 지역 탭 */
  const [activeRegion, setActiveRegion] = useState<string>('all');

  /** 범례 표시/숨김 */
  const [showLegend, setShowLegend] = useState(true);

  /** 사용자 위치 정보 */
  const geo = useGeolocation();

  /** 스팟 클러스터 계산 */
  const { clusters, supercluster } = useSpotClusters({
    spots,
    bounds,
    zoom: viewState.zoom,
  });

  /**
   * 전체 스팟 맞춤 줌 - 최초 로드 시 모든 스팟이 보이도록 바운드 맞춤
   */
  useEffect(() => {
    if (didFitBounds.current || spots.length === 0) return;
    const map = mapRef.current;
    if (!map) return;

    /** 모든 스팟 좌표에서 min/max 바운드 계산 */
    let minLng = 999, maxLng = -999, minLat = 999, maxLat = -999;
    spots.forEach(sf => {
      const lng = Number(sf.spot.longitude);
      const lat = Number(sf.spot.latitude);
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    /** 바운드에 패딩 추가하여 fitBounds 실행 */
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 60, duration: 1000, maxZoom: 12 },
    );
    didFitBounds.current = true;
  }, [spots]);

  /** 지도 이동/줌 시 바운드 업데이트 */
  const updateBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getMap().getBounds();
    setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
  }, []);

  /** 뷰포트 변경 핸들러 */
  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    setViewState(e.viewState);
  }, []);

  /** 지도 로드 완료 시 초기 바운드 설정 */
  const handleLoad = useCallback(() => {
    updateBounds();
  }, [updateBounds]);

  /** 지도 빈 영역 클릭 시 하단 카드 닫기 */
  const handleMapClick = useCallback(() => {
    setSelectedSpot(null);
  }, []);

  /** 클러스터 클릭 시 줌인 */
  const handleClusterClick = useCallback((clusterId: number, lng: number, lat: number) => {
    if (!supercluster) return;
    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 20);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: expansionZoom, duration: 500 });
  }, [supercluster]);

  /** 스팟 마커 클릭 → 하단 카드 표시 + 지도 중심 이동 */
  const handleSpotClick = useCallback((sf: SpotForecast) => {
    setSelectedSpot(sf);
    mapRef.current?.flyTo({
      center: [Number(sf.spot.longitude), Number(sf.spot.latitude)],
      duration: 500,
    });
  }, []);

  /** 지역 퀵 이동 */
  const handleRegionClick = useCallback((key: string) => {
    const region = REGION_BUTTONS.find(r => r.key === key);
    if (!region) return;
    setActiveRegion(key);
    setSelectedSpot(null);
    mapRef.current?.flyTo({
      center: region.center,
      zoom: region.zoom,
      duration: 800,
    });
  }, []);

  /** 줌 인/아웃 */
  const handleZoomIn = useCallback(() => {
    mapRef.current?.flyTo({ zoom: viewState.zoom + 1, duration: 300 });
  }, [viewState.zoom]);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.flyTo({ zoom: viewState.zoom - 1, duration: 300 });
  }, [viewState.zoom]);

  /** 내 위치로 이동 */
  const handleMyLocation = useCallback(() => {
    if (!geo.loading && !geo.error) {
      mapRef.current?.flyTo({
        center: [geo.longitude, geo.latitude],
        zoom: 10,
        duration: 1000,
      });
    }
  }, [geo]);

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onMoveEnd={updateBounds}
        onLoad={handleLoad}
        onClick={handleMapClick}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        minZoom={3}
        maxZoom={18}
        attributionControl={false}
      >
        {/* 클러스터 + 스팟 마커 렌더링 */}
        {clusters.map((feature: SpotFeature) => {
          const [lng, lat] = feature.geometry.coordinates;

          if (feature.properties.cluster) {
            return (
              <ClusterMarker
                key={`cluster-${feature.properties.cluster_id}`}
                clusterId={feature.properties.cluster_id!}
                longitude={lng}
                latitude={lat}
                pointCount={feature.properties.point_count!}
                onClick={handleClusterClick}
              />
            );
          }

          const sf = feature.properties.spotForecast!;
          return (
            <SpotMarker
              key={`spot-${sf.spot.id}`}
              spotForecast={sf}
              onClick={handleSpotClick}
              isSelected={selectedSpot?.spot.id === sf.spot.id}
            />
          );
        })}
      </Map>

      {/* 지역 퀵 이동 버튼 - 상단 */}
      <div className="absolute top-14 left-4 right-16 z-10 flex gap-2">
        {REGION_BUTTONS.map(btn => (
          <button
            key={btn.key}
            onClick={() => handleRegionClick(btn.key)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
              activeRegion === btn.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 색상 범례 - 좌측 하단 */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 rounded-lg px-3 py-2 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-gray-500">컨디션</span>
            <button
              onClick={() => setShowLegend(false)}
              className="text-[10px] text-gray-400 hover:text-gray-600 ml-auto"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            {LEGEND_ITEMS.map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 범례 숨겨진 상태에서 다시 표시 버튼 */}
      {!showLegend && (
        <div className="absolute bottom-3 left-3 z-10">
          <button
            onClick={() => setShowLegend(true)}
            className="bg-white/95 rounded-lg px-2.5 py-1.5 shadow-sm border border-gray-100 text-[10px] text-gray-500 hover:text-gray-700"
          >
            범례
          </button>
        </div>
      )}

      {/* 지도 컨트롤 버튼 */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onMyLocation={handleMyLocation}
        locationLoading={geo.loading}
      />

      {/* 선택된 스팟의 하단 슬라이드 카드 */}
      {selectedSpot && (
        <SpotBottomCard
          spotForecast={selectedSpot}
          onClose={() => setSelectedSpot(null)}
          onDetail={onSpotDetail}
        />
      )}
    </div>
  );
}
