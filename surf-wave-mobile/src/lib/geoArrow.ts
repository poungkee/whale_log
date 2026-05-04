// 지도 위 화살표 그리기를 위한 좌표 계산 유틸 (Task #84, 모바일)
// 웹앱 surf-wave-frontend/src/lib/geoArrow.ts와 동일 로직.
//
// 모바일은 react-native-maps의 <Polyline coordinates={[...]} />에 사용.
// 좌표 형식만 다름: { latitude, longitude } (웹은 { lat, lng })

const EARTH_RADIUS_M = 6371000;

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * 시작점에서 특정 방향으로 거리만큼 떨어진 끝점의 좌표 계산
 * (구면 삼각법 / Haversine 역공식)
 */
export function arrowEndPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): LatLng {
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );

  return {
    latitude: (φ2 * 180) / Math.PI,
    longitude: (((λ2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

/**
 * 화살표 Polyline 좌표 (시작점 + 끝점) — react-native-maps <Polyline coordinates>용
 */
export function arrowPolyline(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): LatLng[] {
  return [
    { latitude: lat, longitude: lng },
    arrowEndPoint(lat, lng, bearingDeg, distanceM),
  ];
}

/**
 * 해변선 — coastFacingDeg ± 90° 양쪽으로 뻗은 직선
 */
export function coastLinePolyline(
  lat: number,
  lng: number,
  coastFacingDeg: number,
  halfLengthM: number = 200,
): LatLng[] {
  const left = arrowEndPoint(lat, lng, coastFacingDeg - 90, halfLengthM);
  const right = arrowEndPoint(lat, lng, coastFacingDeg + 90, halfLengthM);
  return [left, right];
}

/** 풍향 화살표 방향 — FROM → TO 변환 (+180°) */
export function windArrowDirection(windFromDeg: number): number {
  return (windFromDeg + 180) % 360;
}
