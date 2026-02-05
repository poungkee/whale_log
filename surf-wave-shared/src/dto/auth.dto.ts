import { SocialProvider } from '../enums';

export interface RegisterRequest {
  firebaseToken: string;
  nickname: string;
  provider?: SocialProvider;
}

export interface RegisterResponse {
  id: string;
  email: string;
  nickname: string;
  role: string;
  createdAt: string;
}

export interface LoginRequest {
  firebaseToken: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
  surfLevel: string | null;
  notificationsEnabled: boolean;
}
