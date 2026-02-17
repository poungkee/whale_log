/**
 * @file SpotMarker.tsx
 * @description 지도 위 개별 스팟 마커 - Surfline 스타일 원형 마커
 *
 * surfRating 점수에 따라 마커 색상이 변합니다 (신호등 색상 시스템).
 * 7점 이상 고점수 스팟은 펄스 애니메이션으로 강조 표시합니다.
 * 클릭하면 하단 슬라이드 카드를 표시합니다.
 */

import { Marker } from 'react-map-gl/maplibre';
import { getRatingColor, getRatingGrade } from '../lib/utils';
import type { SpotForecast } from '../types';

interface SpotMarkerProps {
  /** 스팟 예보 데이터 */
  spotForecast: SpotForecast;
  /** 마커 클릭 핸들러 */
  onClick: (sf: SpotForecast) => void;
  /** 현재 선택된 스팟인지 여부 */
  isSelected?: boolean;
}

export function SpotMarker({ spotForecast, onClick, isSelected }: SpotMarkerProps) {
  const { spot, surfRating } = spotForecast;
  const color = getRatingColor(surfRating);
  const grade = getRatingGrade(surfRating);
  /** 7점 이상이면 고점수 마커 - 펄스 애니메이션 적용 */
  const isHighRating = surfRating >= 7;

  return (
    <Marker
      longitude={Number(spot.longitude)}
      latitude={Number(spot.latitude)}
      anchor="center"
      onClick={(e) => {
        /** 이벤트 버블링 방지 - 지도 클릭 이벤트로 전파되지 않도록 */
        e.originalEvent.stopPropagation();
        onClick(spotForecast);
      }}
    >
      <div
        className="cursor-pointer transform hover:scale-110 transition-transform relative"
        title={`${spot.name} - ${grade}`}
      >
        {/* 고점수 펄스 링 애니메이션 (surfRating >= 7) */}
        {isHighRating && (
          <div
            className="absolute inset-0 rounded-full animate-ping-slow"
            style={{
              backgroundColor: `${color}30`,
              width: '40px',
              height: '40px',
            }}
          />
        )}

        {/* 선택 상태 링 */}
        {isSelected && (
          <div
            className="absolute -inset-1 rounded-full border-2 animate-pulse"
            style={{ borderColor: color }}
          />
        )}

        {/* 원형 마커 - surfRating 색상 + 점수 표시 */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 relative ${
            isSelected ? 'border-gray-900 scale-110' : 'border-white'
          }`}
          style={{
            backgroundColor: color,
            boxShadow: isSelected
              ? `0 0 0 3px ${color}40, 0 2px 8px ${color}60`
              : `0 2px 8px ${color}50, 0 1px 3px rgba(0,0,0,0.15)`,
          }}
        >
          {surfRating.toFixed(1)}
        </div>
        {/* 스팟 이름 라벨 - 마커 아래에 표시 */}
        <div className="text-center mt-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${
            isSelected
              ? 'text-gray-900 bg-white shadow-md'
              : 'text-gray-700 bg-white/90 shadow-sm'
          }`}>
            {spot.name.length > 8 ? spot.name.slice(0, 8) + '...' : spot.name}
          </span>
        </div>
      </div>
    </Marker>
  );
}
