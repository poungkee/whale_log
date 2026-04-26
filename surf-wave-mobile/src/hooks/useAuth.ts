// 인증 훅 — 로그인/로그아웃 편의 메서드
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    logout,
  };
};
