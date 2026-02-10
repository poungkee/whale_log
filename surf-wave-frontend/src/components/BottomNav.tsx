/**
 * @file BottomNav.tsx
 * @description 하단 네비게이션 바 - 메인 화면의 탭 전환
 *
 * 4개 탭:
 * - 홈 (home): 대시보드 예보 화면 (Home.tsx)
 * - 지도 (map): 스팟 지도 화면 (추후 구현)
 * - 피드 (feed): 커뮤니티 피드 화면 (추후 구현)
 * - 마이 (mypage): 마이페이지 (MyPage.tsx)
 *
 * 현재 활성 탭: primary 색상 + 굵은 아이콘
 * 비활성 탭: muted 색상
 *
 * 고정 위치: 화면 하단 (fixed bottom-0)
 * safe-bottom: iOS 노치 디바이스 대응
 */

import { Home, Map, MessageSquare, User } from 'lucide-react';
import type { MainTab } from '../types';

interface BottomNavProps {
  /** 현재 활성 탭 - App.tsx의 mainTab 상태 */
  currentTab: MainTab;
  /** 탭 전환 핸들러 - App.tsx의 setMainTab(tab) 호출 */
  onNavigate: (tab: MainTab) => void;
}

const navItems: { id: MainTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'map', label: '지도', icon: Map },
  { id: 'feed', label: '피드', icon: MessageSquare },
  { id: 'mypage', label: '마이', icon: User },
];

export function BottomNav({ currentTab, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
