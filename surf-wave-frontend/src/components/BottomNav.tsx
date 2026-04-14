/**
 * @file BottomNav.tsx
 * @description 하단 네비게이션 바 - 서핑 테마 아이콘 4탭 구조
 *
 * 4개 탭:
 * - 홈 (home): 파도 아이콘 → 대시보드 예보 화면
 * - 탐색 (explore): 나침반 아이콘 → 지도/스팟 탐색
 * - 가이드 (guide): 서핑보드 아이콘 → 서핑 가이드
 * - 내정보 (profile): 사람 아이콘 → 마이페이지
 *
 * 활성 탭: primary 색상 + 굵게
 * 비활성 탭: muted 색상
 */

import type { MainTab } from '../types';

interface BottomNavProps {
  /** 현재 활성 탭 */
  currentTab: MainTab;
  /** 탭 전환 핸들러 */
  onNavigate: (tab: MainTab) => void;
}

/** 파도 아이콘 SVG (홈 탭) */
function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1.5-2 3-3 4.5-3s3 1.5 4.5 3 3 3 4.5 3 3-1 4.5-3" />
      <path d="M2 17c1.5-2 3-3 4.5-3s3 1.5 4.5 3 3 3 4.5 3 3-1 4.5-3" />
      <path d="M2 7c1.5-2 3-3 4.5-3s3 1.5 4.5 3 3 3 4.5 3 3-1 4.5-3" />
    </svg>
  );
}

/** 나침반 아이콘 SVG (탐색 탭) */
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

/** 서핑보드 아이콘 SVG (가이드 탭) */
function SurfboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.5 2.5C15.5 1 8 3 4.5 6.5S1 15.5 2.5 18.5c.5 1 2 1 3-0l13-13c1-1 1-2.5 0-3z" />
      <path d="M10.5 13.5L8 16" />
      <circle cx="6.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 사용자 아이콘 SVG (내정보 탭) */
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/** 탭 정의 */
const navItems: { id: MainTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'home', label: '홈', Icon: WaveIcon },
  { id: 'explore', label: '탐색', Icon: CompassIcon },
  { id: 'guide', label: '가이드', Icon: SurfboardIcon },
  { id: 'profile', label: '내정보', Icon: UserIcon },
];

export function BottomNav({ currentTab, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
