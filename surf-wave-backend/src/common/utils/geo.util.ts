/**
 * @file geo.util.ts
 * @description 지리/좌표 유틸리티 함수 모음
 *
 * 서핑 스팟의 위치 기반 검색(주변 스팟 찾기)에 사용되는 지리 계산 함수들입니다.
 * Haversine 공식을 사용하여 두 GPS 좌표 간의 실제 거리를 계산합니다.
 */

/**
 * calculateDistance - 두 GPS 좌표 사이의 거리를 Haversine 공식으로 계산
 *
 * 지구를 구(球)로 가정하고 두 좌표 사이의 대원 거리(great-circle distance)를 계산합니다.
 * 주변 서핑 스팟 검색 시 사용자 위치와 스팟 간의 거리를 계산하는 데 활용됩니다.
 *
 * @param lat1 - 시작점 위도
 * @param lon1 - 시작점 경도
 * @param lat2 - 도착점 위도
 * @param lon2 - 도착점 경도
 * @returns 두 지점 사이의 거리 (km 단위)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** 도(degree)를 라디안(radian)으로 변환하는 내부 헬퍼 함수 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * isWithinRadius - 한 지점이 다른 지점의 반경 내에 있는지 확인
 *
 * 주변 서핑 스팟 검색에서 사용자 위치 반경 내의 스팟만 필터링할 때 사용
 * @param radiusKm - 검색 반경 (km)
 * @returns 반경 내에 있으면 true, 아니면 false
 */
export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  pointLat: number,
  pointLon: number,
  radiusKm: number,
): boolean {
  return calculateDistance(centerLat, centerLon, pointLat, pointLon) <= radiusKm;
}

/**
 * getBoundingBox - 중심 좌표와 반경으로 사각형 경계 상자(Bounding Box)를 계산
 *
 * DB 쿼리 최적화를 위해 사용됩니다. 원형 반경 검색 전에 먼저 사각형 범위로
 * 후보를 좁힌 후, calculateDistance로 정확한 거리를 계산하는 2단계 필터링에 활용.
 * @param lat - 중심 위도
 * @param lon - 중심 경도
 * @param radiusKm - 반경 (km)
 * @returns 최소/최대 위도/경도로 구성된 바운딩 박스
 */
export function getBoundingBox(
  lat: number,
  lon: number,
  radiusKm: number,
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(toRad(lat)));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}
