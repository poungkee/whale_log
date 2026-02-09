import { Home, Map, MessageSquare, User } from 'lucide-react';
import type { MainTab } from '../types';

interface BottomNavProps {
  currentTab: MainTab;
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
