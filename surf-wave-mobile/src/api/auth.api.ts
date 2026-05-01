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
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string | null;
    avatarUrl: string | null;
    role: string;
    surfLevel: string | null;
    boardType: string | null;
    /** 소셜 로그인 제공자 - 'GOOGLE' | 'KAKAO' | null (일반 가입자) */
    provider: string | null;
    notificationsEnabled?: boolean;
  };
  /** 신규 가입자 여부 - 소셜 로그인 첫 가입 시 true (구글: 아이디 설정 팝업 노출용) */
  isNewUser?: boolean;
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
