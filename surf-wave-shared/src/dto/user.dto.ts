export interface UserProfileResponse {
  id: string;
  email: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  surfLevel: string | null;
  notificationsEnabled: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  bio?: string;
  avatarUrl?: string;
  surfLevel?: string;
  notificationsEnabled?: boolean;
}

export interface UpdateFcmTokenRequest {
  fcmToken: string;
}

export interface UserStatsResponse {
  totalDiaries: number;
  totalPosts: number;
  totalComments: number;
  totalFavoriteSpots: number;
  surfDaysThisMonth: number;
  surfDaysThisYear: number;
}

export interface PublicUserProfileResponse {
  id: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  surfLevel: string | null;
  createdAt: string;
}
