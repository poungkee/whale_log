// Axios 인스턴스 — JWT 토큰 자동 첨부 + 401 처리 + 뱃지 획득 알림 자동 큐잉
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ENV } from './env';
import { storage } from './storage';
import { useBadgeNotificationStore } from '../stores/badgeNotificationStore';

export const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 — SecureStore에서 JWT 토큰 꺼내서 헤더에 붙임
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 응답에서 newBadges 배열을 발견하면 알림 큐에 자동 push.
 * 백엔드는 PATCH /users/me, POST /spots/:id/favorite, POST /diary 등의 응답에
 * newBadges: BadgeKey[] 또는 BadgeItem[] 형태로 신규 획득 뱃지를 포함시킴.
 */
function autoEnqueueBadges(data: any) {
  if (!data || typeof data !== 'object') return;
  const badges = data.newBadges;
  if (Array.isArray(badges) && badges.length > 0) {
    useBadgeNotificationStore.getState().enqueue(badges);
  }
}

// 응답 인터셉터 — 401이면 토큰 삭제 + 뱃지 획득 자동 알림
api.interceptors.response.use(
  (response: AxiosResponse) => {
    autoEnqueueBadges(response.data);
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      storage.clearAll();
    }
    return Promise.reject(error);
  }
);
