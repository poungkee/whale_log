import { Difficulty, GuideCategory, ReportStatus } from '../enums';
import { PaginationQuery } from './api-response.dto';

export interface DashboardStatsResponse {
  totalUsers: number;
  activeUsersToday: number;
  totalSpots: number;
  totalPosts: number;
  totalDiaries: number;
  pendingReports: number;
  newUsersThisWeek: number;
}

export interface AdminUserListQuery extends PaginationQuery {
  search?: string;
  role?: string;
  isSuspended?: boolean;
}

export interface SuspendUserRequest {
  isSuspended: boolean;
  suspendedUntil?: string;
  reason?: string;
}

export interface ChangeRoleRequest {
  role: string;
}

export interface CreateSpotRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
  address?: string;
  region?: string;
  difficulty: Difficulty;
  amenities?: Record<string, boolean>;
}

export interface UpdateSpotRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  region?: string;
  difficulty?: Difficulty;
  amenities?: Record<string, boolean>;
  isActive?: boolean;
}

export interface AdminReportListQuery extends PaginationQuery {
  status?: ReportStatus;
}

export interface ResolveReportRequest {
  status: ReportStatus;
  adminNote?: string;
}

export interface CreateGuideRequest {
  title: string;
  content: string;
  category: GuideCategory;
  thumbnailUrl?: string;
  sortOrder?: number;
  estimatedReadMinutes: number;
}

export interface UpdateGuideRequest {
  title?: string;
  content?: string;
  category?: GuideCategory;
  thumbnailUrl?: string;
  sortOrder?: number;
  estimatedReadMinutes?: number;
  isPublished?: boolean;
}

export interface BroadcastNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}
