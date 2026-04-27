// 인증 전역 상태 — zustand + expo-secure-store (JWT 토큰 영구 보관)
import { create } from 'zustand';
import { storage } from '../config/storage';

interface User {
  id: string;
  email: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
  surfLevel: string | null;
  boardType: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  // 프로필 부분 업데이트 (레벨/보드 변경 등)
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      const [token, user] = await Promise.all([
        storage.getToken(),
        storage.getUser(),
      ]);
      if (token && user) {
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (token: string, user: User) => {
    await Promise.all([
      storage.setToken(token),
      storage.setUser(user),
    ]);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await storage.clearAll();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  updateUser: (partial) => {
    set(s => ({ user: s.user ? { ...s.user, ...partial } : s.user }));
  },
}));
