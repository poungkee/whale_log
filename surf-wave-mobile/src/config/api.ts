// Axios 인스턴스 — JWT 토큰 자동 첨부 + 401 처리
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from './env';
import { storage } from './storage';

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

// 응답 인터셉터 — 401이면 토큰 삭제 (자동 로그아웃은 authStore에서 처리)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      storage.clearAll();
    }
    return Promise.reject(error);
  }
);
