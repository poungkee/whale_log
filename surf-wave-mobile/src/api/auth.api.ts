// 인증 API — 회원가입/로그인/회원탈퇴
import { api } from '../config/api';

export interface LoginRequest {
  username: string; // 이메일 또는 아이디
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  nickname: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    avatarUrl: string | null;
    role: string;
    surfLevel: string | null;
  };
}

export const authApi = {
  // 로그인 — JWT 토큰 반환
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data),

  // 회원가입 — JWT 토큰 반환
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data),

  // 회원탈퇴
  withdraw: () =>
    api.delete('/auth/withdraw'),
};
