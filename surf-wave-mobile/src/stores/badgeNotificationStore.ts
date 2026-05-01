// 뱃지 획득 알림 큐 — API 응답에서 newBadges 받으면 push, 화면 곳곳에서 토스트로 소비
//
// 사용 패턴:
//  1. API 호출 후 응답에 newBadges가 있으면 useBadgeNotificationStore.getState().enqueue(newBadges)
//  2. RootNavigator의 BadgeEarnedToast가 큐에서 꺼내 순차 표시
import { create } from 'zustand';

/** 백엔드 /badges/me 응답의 BadgeItem 일부 (알림에 필요한 필드만) */
export interface NewBadge {
  key: string;
  nameKo: string;
  descriptionKo?: string;
  icon?: string;
}

interface BadgeNotificationState {
  /** 표시 대기 중인 뱃지 큐 */
  queue: NewBadge[];
  /** 큐에 추가 — newBadges가 string[] 또는 NewBadge[]로 올 수 있어 둘 다 지원 */
  enqueue: (badges: (NewBadge | string)[]) => void;
  /** 첫 번째 뱃지 제거 (표시 완료 시) */
  dismissFirst: () => void;
}

export const useBadgeNotificationStore = create<BadgeNotificationState>((set) => ({
  queue: [],

  enqueue: (badges) => {
    if (!badges || badges.length === 0) return;
    /** 백엔드가 string[]만 보낼 수도 있어 NewBadge로 정규화 */
    const normalized: NewBadge[] = badges.map((b) =>
      typeof b === 'string' ? { key: b, nameKo: b } : b,
    );
    set((s) => ({ queue: [...s.queue, ...normalized] }));
  },

  dismissFirst: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
