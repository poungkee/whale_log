/**
 * @file SpotBottomCard.tsx
 * @description 하단 슬라이드 카드 - 마커 클릭 시 하단에서 올라오는 상세 카드
 *
 * Google Maps / Surfline 스타일의 하단 시트입니다.
 * 팝업 대신 화면 하단에서 슬라이드 업 되며,
 * "자세히 보기" 클릭 시 SpotDetailModal을 엽니다.
 *
 * 표시 정보:
 * - 스팟 이름, 지역, 난이도
 * - surfRating 점수 + 등급 배지
 * - 파고, 주기, 풍속, 조석
 * - hints 태그 배지
 * - 추천 문구
 */

import { X, Waves, Wind, Clock, ArrowUp, ArrowDown, Sun, CloudRain, Cloud, Droplets } from 'lucide-react';
import { getRatingColor, getRatingGrade } from '../lib/utils';
import type { SpotForecast } from '../types';

/** 날씨 상태 → lucide 아이콘 반환 */
function getWeatherIconEl(condition: string | null): React.ReactNode {
  if (!condition) return <Cloud className="w-4 h-4 text-gray-400" />;
  if (condition.includes('맑음')) return <Sun className="w-4 h-4 text-amber-400" />;
  if (condition.includes('비') || condition.includes('소나기')) return <CloudRain className="w-4 h-4 text-blue-400" />;
  return <Cloud className="w-4 h-4 text-gray-400" />;
}

interface SpotBottomCardProps {
  /** 표시할 스팟 예보 데이터 */
  spotForecast: SpotForecast;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 자세히 보기 핸들러 → SpotDetailModal 오픈 */
  onDetail: (sf: SpotForecast) => void;
}

/** 난이도 한국어 약칭 */
function getDifficultyShort(difficulty: string): string {
  const d = difficulty?.toUpperCase() || '';
  if (d === 'BEGINNER') return '초급';
  if (d === 'INTERMEDIATE') return '중급';
  if (d === 'ADVANCED') return '상급';
  if (d === 'EXPERT') return '전문가';
  return difficulty;
}

/** 조석 상태 한국어 */
function getTideLabel(status: string | null): { label: string; rising: boolean } {
  switch (status) {
    case 'RISING': return { label: '밀물', rising: true };
    case 'FALLING': return { label: '썰물', rising: false };
    case 'HIGH': return { label: '만조', rising: true };
    case 'LOW': return { label: '간조', rising: false };
    default: return { label: '', rising: false };
  }
}

export function SpotBottomCard({ spotForecast, onClose, onDetail }: SpotBottomCardProps) {
  const { spot, forecast, surfRating, recommendationKo, hints } = spotForecast;
  const color = getRatingColor(surfRating);
  const grade = getRatingGrade(surfRating);
  const tideInfo = forecast?.tideStatus ? getTideLabel(forecast.tideStatus) : null;

  return (
    <>
      {/* 배경 오버레이 - 클릭하면 카드 닫기 */}
      <div
        className="absolute inset-0 z-30"
        onClick={onClose}
      />

      {/* 하단 슬라이드 카드 */}
      <div className="absolute bottom-0 left-0 right-0 z-40 animate-slide-up">
        <div className="bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] max-w-md mx-auto">
          {/* 드래그 핸들 바 */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="px-4 pb-5">
            {/* 상단: 스팟 이름 + 지역 + 점수 배지 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 mr-3">
                <h3 className="text-base font-bold text-gray-900">{spot.name}</h3>
                <p className="text-xs text-gray-500">
                  {spot.region} · {getDifficultyShort(spot.difficulty)}
                </p>
              </div>
              {/* surfRating 점수 배지 */}
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-lg font-black" style={{ color }}>
                  {surfRating.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-gray-500">{grade}</span>
              </div>
            </div>

            {/* 컨디션 요약 - 파고/주기/풍속/조석 */}
            {forecast && (
              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-100">
                {/* 파고 */}
                <div className="flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {Number(forecast.waveHeight).toFixed(1)}m
                    </div>
                    <div className="text-[10px] text-gray-400">파고</div>
                  </div>
                </div>
                {/* 주기 */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {Number(forecast.wavePeriod).toFixed(0)}s
                    </div>
                    <div className="text-[10px] text-gray-400">주기</div>
                  </div>
                </div>
                {/* 풍속 */}
                {forecast.windSpeed && (
                  <div className="flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-teal-500" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        {Number(forecast.windSpeed).toFixed(0)}km/h
                      </div>
                      <div className="text-[10px] text-gray-400">풍속</div>
                    </div>
                  </div>
                )}
                {/* 조석 */}
                {tideInfo && tideInfo.label && (
                  <div className="flex items-center gap-1.5">
                    {tideInfo.rising
                      ? <ArrowUp className="w-4 h-4 text-orange-500" />
                      : <ArrowDown className="w-4 h-4 text-cyan-500" />
                    }
                    <div>
                      <div className="text-sm font-bold text-gray-900">{tideInfo.label}</div>
                      <div className="text-[10px] text-gray-400">조석</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 날씨 / 기온 / 수온 행 (신규) */}
            {forecast && (forecast.weatherCondition || forecast.airTemperature != null || forecast.waterTemperature != null) && (
              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-100">
                {/* 날씨 + 기온 */}
                {(forecast.weatherCondition || forecast.airTemperature != null) && (
                  <div className="flex items-center gap-1.5">
                    {getWeatherIconEl(forecast.weatherCondition)}
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        {forecast.weatherCondition || ''}
                        {forecast.airTemperature != null && ` ${Number(forecast.airTemperature).toFixed(0)}°C`}
                      </div>
                      <div className="text-[10px] text-gray-400">날씨</div>
                    </div>
                  </div>
                )}
                {/* 수온 */}
                {forecast.waterTemperature != null && (
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        {Number(forecast.waterTemperature).toFixed(0)}°C
                      </div>
                      <div className="text-[10px] text-gray-400">수온</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* hints 태그 배지 */}
            {hints && hints.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {hints.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${getHintColor(tag)}15`,
                      color: getHintColor(tag),
                    }}
                  >
                    {getHintLabel(tag)}
                  </span>
                ))}
              </div>
            )}

            {/* 추천 문구 */}
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {hints?.message || recommendationKo}
            </p>

            {/* 자세히 보기 버튼 */}
            <button
              onClick={() => onDetail(spotForecast)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: color }}
            >
              자세히 보기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** hints 태그 색상 */
function getHintColor(tag: string): string {
  switch (tag) {
    case 'SAFETY_WARNING': case 'WAVE_TOO_BIG': return '#E74C3C';
    case 'WAVE_TOO_SMALL': return '#95A5A6';
    case 'STRONG_WIND': case 'ONSHORE_WIND': return '#E67E22';
    case 'OFFSHORE_WIND': case 'GOOD_SWELL': case 'LONG_PERIOD': return '#2ECC71';
    case 'BAD_SWELL': case 'SHORT_PERIOD': return '#F1C40F';
    case 'LONGBOARD_TIP': return '#32CD32';
    case 'SHORTBOARD_TIP': return '#FF8C00';
    case 'GREAT_CONDITION': return '#9B59B6';
    default: return '#95A5A6';
  }
}

/** hints 태그 한국어 라벨 */
function getHintLabel(tag: string): string {
  switch (tag) {
    case 'SAFETY_WARNING': return '안전주의';
    case 'WAVE_TOO_BIG': return '높은파도';
    case 'WAVE_TOO_SMALL': return '잔잔';
    case 'STRONG_WIND': return '강풍';
    case 'ONSHORE_WIND': return '온쇼어';
    case 'OFFSHORE_WIND': return '오프쇼어';
    case 'GOOD_SWELL': return '좋은스웰';
    case 'BAD_SWELL': return '스웰불량';
    case 'SHORT_PERIOD': return '짧은주기';
    case 'LONG_PERIOD': return '긴주기';
    case 'LONGBOARD_TIP': return '롱보드';
    case 'SHORTBOARD_TIP': return '숏보드';
    case 'GREAT_CONDITION': return '최고';
    default: return tag;
  }
}
