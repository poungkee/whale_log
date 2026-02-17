/**
 * @file SpotPopup.tsx
 * @description 지도 위 스팟 팝업 - 마커 클릭 시 표시되는 간략 정보 카드
 *
 * 표시 정보: 스팟 이름, surfRating, 파고, 풍속, 추천 문구
 * "자세히 보기" 클릭 시 SpotDetailModal 오픈
 */

import { Popup } from 'react-map-gl/maplibre';
import { getRatingColor, getRatingGrade } from '../lib/utils';
import type { SpotForecast } from '../types';

interface SpotPopupProps {
  /** 표시할 스팟 예보 데이터 */
  spotForecast: SpotForecast;
  /** 팝업 닫기 핸들러 */
  onClose: () => void;
  /** "자세히 보기" 클릭 핸들러 - SpotDetailModal 오픈 */
  onDetail: (sf: SpotForecast) => void;
}

export function SpotPopup({ spotForecast, onClose, onDetail }: SpotPopupProps) {
  const { spot, forecast, surfRating, simpleCondition, recommendationKo } = spotForecast;
  const color = getRatingColor(surfRating);
  const grade = getRatingGrade(surfRating);

  return (
    <Popup
      longitude={Number(spot.longitude)}
      latitude={Number(spot.latitude)}
      anchor="bottom"
      onClose={onClose}
      closeOnClick={false}
      maxWidth="280px"
      className="spot-popup"
    >
      <div className="p-3 min-w-[240px] bg-white rounded-xl">
        {/* 스팟 이름 + 등급 배지 */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm text-gray-900 truncate flex-1">
            {spot.name}
          </h3>
          <div
            className="ml-2 px-2 py-0.5 rounded-full text-white text-xs font-bold"
            style={{ backgroundColor: color }}
          >
            {surfRating.toFixed(1)} {grade}
          </div>
        </div>

        {/* 간략 컨디션 정보 */}
        {forecast && (
          <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-500 mb-2">
            <div>파고: <span className="font-semibold text-gray-900">{Number(forecast.waveHeight).toFixed(1)}m</span></div>
            <div>주기: <span className="font-semibold text-gray-900">{Number(forecast.wavePeriod).toFixed(0)}s</span></div>
            {forecast.windSpeed && (
              <div>풍속: <span className="font-semibold text-gray-900">{Number(forecast.windSpeed).toFixed(0)}km/h</span></div>
            )}
            {simpleCondition && (
              <div>상태: <span className="font-semibold text-gray-900">{simpleCondition.overall}</span></div>
            )}
          </div>
        )}

        {/* 추천 문구 */}
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{recommendationKo}</p>

        {/* 자세히 보기 버튼 */}
        <button
          onClick={() => onDetail(spotForecast)}
          className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1"
        >
          자세히 보기 →
        </button>
      </div>
    </Popup>
  );
}
