export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const calculateDistance = (
  point1: Coordinates,
  point2: Coordinates
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const sortByDistance = <T extends { latitude: number; longitude: number }>(
  items: T[],
  currentLocation: Coordinates
): T[] => {
  return [...items].sort((a, b) => {
    const distA = calculateDistance(currentLocation, a);
    const distB = calculateDistance(currentLocation, b);
    return distA - distB;
  });
};

export const isWithinRadius = (
  point: Coordinates,
  center: Coordinates,
  radiusMeters: number
): boolean => {
  return calculateDistance(point, center) <= radiusMeters;
};

export const getRegionFromCoordinates = (coordinates: Coordinates): string => {
  // Simplified region detection for Korean surf spots
  const { latitude, longitude } = coordinates;

  if (latitude >= 37.5 && longitude >= 128.5) return '양양';
  if (latitude >= 37.0 && latitude < 37.5 && longitude >= 128.5) return '속초';
  if (latitude <= 35.5 && longitude >= 129.0) return '부산';
  if (latitude <= 33.5) return '제주';

  return '기타';
};
