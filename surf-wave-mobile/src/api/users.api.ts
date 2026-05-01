import { api } from '../config/api';

export const usersApi = {
  getMe: () => api.get('/users/me'),

  /** 프로필 수정 — username 변경 시 백엔드에서 중복 체크 (409 반환) */
  updateProfile: (data: {
    username?: string;
    avatarUrl?: string;
    surfLevel?: string;
    boardType?: string;
    boardSizeFt?: number | null;
    notificationsEnabled?: boolean;
  }) => api.patch('/users/me', data),

  /** 아이디 중복 확인 — 마이페이지 아이디 변경 전 호출 */
  checkUsername: (username: string) =>
    api.post<{ available: boolean }>('/auth/check-username', { username }),

  updateFcmToken: (fcmToken: string) =>
    api.patch('/users/me/fcm-token', { fcmToken }),

  getMyStats: () => api.get('/users/me/stats'),

  getUser: (userId: string) => api.get(`/users/${userId}`),
};
