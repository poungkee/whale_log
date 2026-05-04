/**
 * @file geoArrow.ts
 * @description 지도 위 화살표 그리기를 위한 좌표 계산 유틸 (Task #84)
 *
 * 위성지도에서 풍향/스웰/해변선 화살표를 그릴 때:
 * 시작점(스팟 좌표) + 방향(°) + 거리(m) → 끝점(lat, lng) 계산
 *
 * 지구 곡률을 반영한 구면 삼각법 (Haversine 역공식) 사용.
 * 짧은 거리(<1km)에서는 평면 근사도 가능하지만 정확도 위해 구면 사용.
 */

const EARTH_RADIUS_M = 6371000;

/**
 * 시작점에서 특정 방향으로 거리만큼 떨어진 끝점의 좌표 계산
 *
 * @param lat        시작 위도 (°)
 * @param lng        시작 경도 (°)
 * @param bearingDeg 방향 (°, 0=북, 90=동, 180=남, 270=서)
 * @param distanceM  거리 (미터)
 * @returns          끝점 { lat, lng }
 */
export function arrowEndPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): { lat: number; lng: number } {
  const δ = distanceM / EARTH_RADIUS_M; // 각거리 (라디안)
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;

  /** 구면 삼각법 — 끝점 위도 */
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  /** 끝점 경도 */
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );

  return {
    lat: (φ2 * 180) / Math.PI,
    /** 경도는 -180~180 범위로 정규화 */
    lng: (((λ2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

/**
 * 화살표 GeoJSON LineString 생성 — maplibre-gl <Source> 용
 * 시작점 + 끝점 두 점만 가진 라인
 */
export function arrowLineString(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): GeoJSON.Feature<GeoJSON.LineString> {
  const end = arrowEndPoint(lat, lng, bearingDeg, distanceM);
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [lng, lat],
        [end.lng, end.lat],
      ],
    },
  };
}

/**
 * 해변선 LineString 생성 — coastFacingDeg ± 90° 양쪽으로 뻗은 직선
 * 해변이 동향(90°)이면 해변선은 남↔북 방향 (90-90=0° 와 90+90=180°)
 */
export function coastLineString(
  lat: number,
  lng: number,
  coastFacingDeg: number,
  halfLengthM: number = 200,
): GeoJSON.Feature<GeoJSON.LineString> {
  const left = arrowEndPoint(lat, lng, coastFacingDeg - 90, halfLengthM);
  const right = arrowEndPoint(lat, lng, coastFacingDeg + 90, halfLengthM);
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [left.lng, left.lat],
        [right.lng, right.lat],
      ],
    },
  };
}

/**
 * 풍향 화살표 — windDirection은 "불어오는 방향(FROM)"이라 +180°로 변환
 * 화살표는 바람이 가는 방향을 가리킴 (사용자 직관)
 */
export function windArrowDirection(windFromDeg: number): number {
  return (windFromDeg + 180) % 360;
}
