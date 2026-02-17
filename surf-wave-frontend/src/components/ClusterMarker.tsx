/**
 * @file ClusterMarker.tsx
 * @description 지도 위 클러스터 마커 - 여러 스팟이 겹칠 때 표시
 *
 * 클러스터 크기에 따라 마커 크기가 달라집니다.
 * 클릭하면 해당 클러스터 영역으로 줌인합니다.
 */

import { Marker } from 'react-map-gl/maplibre';

interface ClusterMarkerProps {
  /** 클러스터 ID (supercluster에서 발급) */
  clusterId: number;
  /** 경도 */
  longitude: number;
  /** 위도 */
  latitude: number;
  /** 클러스터에 포함된 스팟 수 */
  pointCount: number;
  /** 클릭 핸들러 - 클러스터 줌인 */
  onClick: (clusterId: number, lng: number, lat: number) => void;
}

export function ClusterMarker({ clusterId, longitude, latitude, pointCount, onClick }: ClusterMarkerProps) {
  /** 스팟 수에 따라 마커 크기 결정 (최소 36px ~ 최대 56px) */
  const size = Math.min(56, 36 + Math.log2(pointCount) * 6);

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(clusterId, longitude, latitude);
      }}
    >
      {/* 클러스터 원형 마커 - 파란색 그라데이션 + 스팟 수 표시 */}
      <div
        className="cursor-pointer rounded-full flex items-center justify-center text-white font-bold border-2 border-white hover:scale-105 transition-transform"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
          fontSize: pointCount >= 100 ? '11px' : '13px',
          boxShadow: '0 2px 8px rgba(59,130,246,0.5), 0 1px 3px rgba(0,0,0,0.15)',
        }}
      >
        {pointCount}
      </div>
    </Marker>
  );
}
