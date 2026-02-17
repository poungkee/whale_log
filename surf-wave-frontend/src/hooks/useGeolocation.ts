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

/** 기본 좌표 - 양양 서피비치 (국내 주요 서핑 스팟) */
const DEFAULT_COORDS = { latitude: 38.029, longitude: 128.6741 };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    ...DEFAULT_COORDS,
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
        /** 위치 정보 실패 - 기본값(양양) 유지 */
        setState(prev => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      },
      {
        enableHighAccuracy: false, // 빠른 응답 우선
        timeout: 5000,             // 5초 타임아웃
        maximumAge: 300000,        // 5분간 캐시 허용
      },
    );
  }, []);

  return state;
}
