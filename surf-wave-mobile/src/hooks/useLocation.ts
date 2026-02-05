import { useEffect, useCallback } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';
import { useLocationStore } from '../stores/locationStore';

export const useLocation = () => {
  const {
    currentLocation,
    permissionStatus,
    setCurrentLocation,
    setPermissionStatus,
    setLoading,
    isLoading
  } = useLocationStore();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      setPermissionStatus(status);
      return status === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      setPermissionStatus(isGranted ? 'granted' : 'denied');
      return isGranted;
    }

    return false;
  }, [setPermissionStatus]);

  const getCurrentLocation = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;

    setLoading(true);
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCurrentLocation(location);
          setLoading(false);
          resolve(location);
        },
        (error) => {
          setLoading(false);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }, [requestPermission, setCurrentLocation, setLoading]);

  return {
    currentLocation,
    permissionStatus,
    isLoading,
    requestPermission,
    getCurrentLocation,
  };
};
