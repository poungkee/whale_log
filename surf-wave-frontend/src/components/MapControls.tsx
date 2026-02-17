/**
 * @file MapControls.tsx
 * @description 지도 컨트롤 버튼 - 줌 인/아웃, 내 위치 이동
 *
 * 지도 우측 하단에 표시되는 컨트롤 버튼 그룹입니다.
 * - 줌 인 (+) / 줌 아웃 (-)
 * - 내 위치로 이동 (GPS 아이콘)
 */

import { Locate, Plus, Minus } from 'lucide-react';

interface MapControlsProps {
  /** 줌 인 핸들러 */
  onZoomIn: () => void;
  /** 줌 아웃 핸들러 */
  onZoomOut: () => void;
  /** 내 위치로 이동 핸들러 */
  onMyLocation: () => void;
  /** 내 위치 로딩 중 여부 */
  locationLoading?: boolean;
}

export function MapControls({ onZoomIn, onZoomOut, onMyLocation, locationLoading }: MapControlsProps) {
  return (
    <div className="absolute bottom-6 right-4 flex flex-col gap-2 z-10">
      {/* 내 위치 버튼 */}
      <button
        onClick={onMyLocation}
        className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-700"
        style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}
        title="내 위치로 이동"
      >
        <Locate className={`w-5 h-5 ${locationLoading ? 'animate-pulse text-blue-500' : ''}`} />
      </button>

      {/* 줌 컨트롤 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
        <button
          onClick={onZoomIn}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors border-b border-gray-200 text-gray-700"
          title="줌 인"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={onZoomOut}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-700"
          title="줌 아웃"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
