// 인증 전역 상태 — zustand + expo-secure-store (JWT 토큰 영구 보관)
import { create } from 'zustand';
import { storage } from '../config/storage';

interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
  surfLevel: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // 앱 시작 시 SecureStore에서 기존 토큰/유저 복원
  initialize: () => Promise<void>;
  // 로그인 성공 시 토큰+유저 저장
  login: (token: string, user: User) => Promise<void>;
  // 로그아웃 시 SecureStore 전체 삭제
  logout: () => Promise<void>;
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
}));
