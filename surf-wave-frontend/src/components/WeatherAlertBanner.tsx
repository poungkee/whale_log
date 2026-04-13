/**
 * @file WeatherAlertBanner.tsx
 * @description 기상청 기상특보 전역 UI 컴포넌트
 *
 * 두 가지 형태로 표시:
 * 1. GlobalAlertBanner  — 앱 최상단 고정 띠 배너 (어느 탭에서든 항상 노출)
 * 2. AlertEntryModal    — 앱 진입 시 첫 1회 경고 모달 (확인 누르면 사라짐)
 *
 * 표시 조건:
 *   isDangerous: true  → 빨간 배너 + 모달 (풍랑/태풍)
 *   isDangerous: false → 주황 배너만, 모달 없음 (강풍)
 */

import { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';

/** 서핑 관련 특보 요약 */
export interface SurfAlertSummary {
  hasSurfAlert: boolean;
  isDangerous: boolean;
  alerts: Array<{
    alertName: string;
    areaNm: string;
    level: string;
    isDangerous: boolean;
  }>;
  lastUpdated: string | null;
}

// ────────────────────────────────────────────
// 1. 앱 최상단 고정 배너
// ────────────────────────────────────────────

interface GlobalAlertBannerProps {
  summary: SurfAlertSummary;
  onDetailClick: () => void;
}

/**
 * GlobalAlertBanner
 * 특보 발령 중일 때 앱 최상단에 항상 고정 표시
 * 클릭하면 상세 모달 열림
 */
export function GlobalAlertBanner({ summary, onDetailClick }: GlobalAlertBannerProps) {
  if (!summary.hasSurfAlert) return null;

  const { isDangerous, alerts } = summary;
  /** 가장 심각한 특보 1개를 대표로 표시 */
  const topAlert = alerts.find((a) => a.isDangerous) ?? alerts[0];

  return (
    <button
      onClick={onDetailClick}
      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-opacity active:opacity-80 ${
        isDangerous
          ? 'bg-red-600'
          : 'bg-orange-500'
      }`}
    >
      {isDangerous ? (
        <ShieldAlert className="w-4 h-4 text-white shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-white shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <span className="text-white text-xs font-bold">
          {topAlert.alertName} 발령 중
        </span>
        <span className="text-white/80 text-xs ml-2">
          {topAlert.areaNm}
        </span>
        {alerts.length > 1 && (
          <span className="text-white/70 text-xs ml-1">
            외 {alerts.length - 1}건
          </span>
        )}
      </div>

      {/* 자세히 보기 힌트 */}
      <span className="text-white/80 text-[11px] font-medium shrink-0">
        자세히 ›
      </span>
    </button>
  );
}

// ────────────────────────────────────────────
// 2. 진입 시 경고 모달
// ────────────────────────────────────────────

interface AlertEntryModalProps {
  summary: SurfAlertSummary;
  onClose: () => void;
}

/**
 * AlertEntryModal
 * 앱 진입 시 풍랑/태풍 특보 발령 중이면 1회 표시
 * "확인했어요" 누르면 닫힘 (세션 동안 재표시 안 함)
 */
export function AlertEntryModal({ summary, onClose }: AlertEntryModalProps) {
  const [expanded, setExpanded] = useState(false);

  if (!summary.hasSurfAlert) return null;

  const { isDangerous, alerts } = summary;
  /** 풍랑/태풍만 있는 경우 모달 표시 (강풍은 배너만) */
  const dangerousAlerts = alerts.filter((a) => a.isDangerous);
  if (!dangerousAlerts.length) return null;

  const topAlert = dangerousAlerts[0];
  const isWave = topAlert.alertName.includes('풍랑');
  const isTyphoon = topAlert.alertName.includes('태풍');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm bg-[#1A2332] rounded-2xl overflow-hidden shadow-2xl">

        {/* 헤더 — 빨간 배경 */}
        <div className="bg-red-600 px-5 py-5 text-center">
          <div className="text-4xl mb-2">
            {isTyphoon ? '🌀' : isWave ? '🌊' : '⚠️'}
          </div>
          <h2 className="text-white text-lg font-black">
            {topAlert.alertName} 발령 중
          </h2>
          <p className="text-red-100 text-sm mt-1">
            {topAlert.areaNm}
            {dangerousAlerts.length > 1 && ` 외 ${dangerousAlerts.length - 1}곳`}
          </p>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4">
          {/* 핵심 경고 메시지 */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm font-bold text-center">
              {topAlert.level === '경보'
                ? '⛔ 입수 절대 금지 구역입니다'
                : '⚠️ 입수 위험 — 각별히 주의하세요'}
            </p>
          </div>

          {/* 특보 정보 */}
          <div className="text-xs text-muted-foreground mb-1">
            기상청 기상특보 ({new Date().toLocaleDateString('ko-KR')} 기준)
          </div>

          {/* 여러 건 있으면 펼치기 */}
          {dangerousAlerts.length > 1 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs text-muted-foreground mb-2"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              전체 {dangerousAlerts.length}건 보기
            </button>
          )}

          {expanded && (
            <div className="space-y-1.5 mb-3">
              {dangerousAlerts.map((a, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{a.areaNm}</span>
                  <span className="text-red-400 font-semibold">{a.alertName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 확인 버튼 */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            확인했어요
          </button>
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            서핑 전 반드시 해양경찰서에 신고하세요
          </p>
        </div>
      </div>
    </div>
  );
}
