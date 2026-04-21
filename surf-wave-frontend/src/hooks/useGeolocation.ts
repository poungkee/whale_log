/**
 * @file useGeolocation.ts
 * @description 브라우저 위치 정보 훅 - 사용자 현재 위치 가져오기
 *
 * 지도 초기 중심 좌표를 사용자 위치로 설정하기 위해 사용됩니다.
 * 위치 권한이 없거나 실패하면 기본값(양양)을 반환합니다.
 */

import { useState, useEffect } from 'react';

/** 위치 정보 상태 */
interface GeolocationState {
  latitude: number;   // 위도
  longitude: number;  // 경도
  loading: boolean;   // 로딩 중 여부
  error: string | null; // 에러 메시지
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: 0,
    longitude: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    /** 브라우저 Geolocation API 미지원 시 기본값 사용 */
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, loading: false, error: '위치 정보를 지원하지 않는 브라우저입니다' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        /** 위치 정보 성공 - 사용자 좌표 저장 */
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        /** 위치 정보 실패 — 좌표 0,0 유지 + error 설정 */
        setState({ latitude: 0, longitude: 0, loading: false, error: err.message });
      },
      {
        enableHighAccuracy: true, // 정확한 GPS 위치
        timeout: 10000,
        maximumAge: 0,            // 캐시 사용 안 함
      },
    );
  }, []);

  return state;
}
