/**
 * @file useSpotClusters.ts
 * @description 스팟 클러스터링 훅 - Supercluster를 사용한 지도 마커 그룹화
 *
 * 많은 스팟이 겹치는 줌 레벨에서 마커를 클러스터로 그룹화합니다.
 * 줌 인/아웃에 따라 클러스터가 자동으로 분리/합쳐집니다.
 *
 * 사용: SpotMap 컴포넌트에서 지도 바운드 변경 시 호출
 */

import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { SpotForecast } from '../types';

/** Supercluster의 GeoJSON Feature 타입 - 스팟 데이터를 포함 */
export interface SpotFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [경도, 위도]
  };
  properties: {
    /** 클러스터 여부 (supercluster가 자동 추가) */
    cluster?: boolean;
    /** 클러스터에 포함된 스팟 수 */
    point_count?: number;
    /** 클러스터 ID (supercluster가 자동 추가) */
    cluster_id?: number;
    /** 원본 스팟 예보 데이터 (클러스터가 아닌 개별 스팟일 때) */
    spotForecast?: SpotForecast;
  };
}

/** 지도 바운드 (서쪽, 남쪽, 동쪽, 북쪽 경도/위도 범위) */
type Bounds = [number, number, number, number];

interface UseSpotClustersParams {
  /** 전체 스팟 예보 데이터 배열 */
  spots: SpotForecast[];
  /** 현재 지도 바운드 [서경, 남위, 동경, 북위] */
  bounds: Bounds | null;
  /** 현재 줌 레벨 */
  zoom: number;
}

export function useSpotClusters({ spots, bounds, zoom }: UseSpotClustersParams) {
  /** GeoJSON Feature 배열로 변환 (스팟 좌표를 GeoJSON 포맷에 맞게) */
  const points = useMemo(() =>
    spots
      .filter(sf => sf.spot.latitude && sf.spot.longitude)
      .map(sf => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [Number(sf.spot.longitude), Number(sf.spot.latitude)] as [number, number],
        },
        properties: { spotForecast: sf },
      })),
    [spots],
  );

  /** Supercluster 인스턴스 생성 (줌 범위: 0~20, 클러스터 반경: 60px) */
  const index = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,     // 클러스터 병합 반경 (px)
      maxZoom: 16,     // 최대 줌에서도 클러스터링 가능
      minZoom: 0,
    });
    sc.load(points);
    return sc;
  }, [points]);

  /** 현재 바운드와 줌에 해당하는 클러스터/스팟 목록 */
  const clusters: SpotFeature[] = useMemo(() => {
    if (!bounds) return [];
    return index.getClusters(bounds, Math.floor(zoom)) as SpotFeature[];
  }, [index, bounds, zoom]);

  return { clusters, supercluster: index };
}
