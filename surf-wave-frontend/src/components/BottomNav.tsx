/**
 * @file BottomNav.tsx
 * @description 하단 네비게이션 바 - 서핑 테마 아이콘
 *
 * 활성 탭: 타원형 primary 배경 + 흰 아이콘
 * 비활성 탭: muted 색상 아이콘 + 라벨
 */

import type { MainTab } from '../types';

interface BottomNavProps {
  currentTab: MainTab;
  onNavigate: (tab: MainTab) => void;
}

/** 서퍼 아이콘 (홈 탭) — 파도 위에 서 있는 사람 실루엣 */
function SurferIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      {/* 머리 */}
      <circle cx="14" cy="4" r="1.6" />
      {/* 몸통 — 앞으로 숙인 자세 */}
      <path d="M13.2 5.8 L10.5 10.5 L7.5 9.5 L6.8 10.8 L10.2 12.2 L8.5 15.5 L10 15.5 L12.2 11.8 L14.8 12.8 L16.5 8.5 Z" />
      {/* 서프보드 */}
      <path d="M4 16.5 Q9 14.5 20 17.5 Q15 20 4 16.5Z" opacity="0.85" />
      {/* 파도 */}
      <path d="M2 20 Q5 18.5 8 20 Q11 21.5 14 20 Q17 18.5 22 20" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6" />
    </svg>
  );
}

/** 탐색 아이콘 (나침반) */
function ExploreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      {/* 나침반 바늘 */}
      <path d="M16.2 7.8 L13.5 13.5 L7.8 16.2 L10.5 10.5 Z" fill="currentColor" stroke="none" opacity="0.9" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 가이드 아이콘 (서프보드 + 파도) */
function GuideIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* 서프보드 세로 */}
      <path d="M12 3 Q16 5 16 12 Q16 18 12 21 Q8 18 8 12 Q8 5 12 3Z" />
      {/* 핀 */}
      <path d="M12 18 L10.5 21.5 L12 20.5 L13.5 21.5 Z" fill="currentColor" stroke="none" />
      {/* 중앙선 */}
      <line x1="12" y1="6" x2="12" y2="16" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** 내정보 아이콘 (사람) */
function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M4.5 20.5 C4.5 16.5 7.5 13.5 12 13.5 C16.5 13.5 19.5 16.5 19.5 20.5" />
    </svg>
  );
}

/** 탭 정의 */
const navItems: { id: MainTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'home',    label: 'HOME',    Icon: SurferIcon  },
  { id: 'explore', label: 'EXPLORE', Icon: ExploreIcon },
  { id: 'guide',   label: 'GUIDE',   Icon: GuideIcon   },
  { id: 'profile', label: 'MY INFO', Icon: ProfileIcon },
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
              className="flex flex-col items-center justify-center gap-1 px-3 py-1.5 transition-colors"
            >
              {isActive ? (
                /* 활성: 타원형 primary 배경 + 흰 아이콘 */
                <div className="w-12 h-8 rounded-full bg-primary flex items-center justify-center">
                  <item.Icon className="w-5 h-5 text-primary-foreground" />
                </div>
              ) : (
                /* 비활성: 아이콘만 */
                <div className="w-12 h-8 flex items-center justify-center">
                  <item.Icon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <span
                className={`text-[10px] font-semibold tracking-wide ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
