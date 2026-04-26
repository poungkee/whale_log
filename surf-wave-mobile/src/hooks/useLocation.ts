// 위치 훅 — expo-location으로 현재 위치 요청
import { useCallback } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../stores/locationStore';

export const useLocation = () => {
  const { currentLocation, setLocation } = useLocationStore();

  const getCurrentLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    setLocation(location);
    return location;
  }, [setLocation]);

  return {
    currentLocation,
    getCurrentLocation,
  };
};
