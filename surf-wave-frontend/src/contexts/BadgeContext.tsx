/**
 * @file BadgeContext.tsx
 * @description 뱃지 획득 팝업 전역 컨텍스트
 *
 * API 응답에 newBadges: string[] 가 있으면 pushBadges(keys) 를 호출해 팝업 큐에 추가
 * 어느 컴포넌트에서든 useBadgeNotify() 훅으로 사용 가능
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

interface BadgeContextValue {
  /** 뱃지 큐에 새 뱃지 추가 */
  pushBadges: (keys: string[]) => void;
  /** 현재 큐 */
  badgeQueue: string[];
  /** 큐의 첫 번째 항목 제거 (팝업이 닫힐 때 호출) */
  dismissFirst: () => void;
}

const BadgeContext = createContext<BadgeContextValue>({
  pushBadges: () => {},
  badgeQueue: [],
  dismissFirst: () => {},
});

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [badgeQueue, setBadgeQueue] = useState<string[]>([]);

  const pushBadges = (keys: string[]) => {
    if (keys?.length) setBadgeQueue(prev => [...prev, ...keys]);
  };

  const dismissFirst = () => {
    setBadgeQueue(prev => prev.slice(1));
  };

  return (
    <BadgeContext.Provider value={{ pushBadges, badgeQueue, dismissFirst }}>
      {children}
    </BadgeContext.Provider>
  );
}

/** 뱃지 알림을 띄우고 싶은 컴포넌트에서 사용 */
export function useBadgeNotify() {
  return useContext(BadgeContext).pushBadges;
}

export function useBadgeQueue() {
  const { badgeQueue, dismissFirst } = useContext(BadgeContext);
  return { badgeQueue, dismissFirst };
}
