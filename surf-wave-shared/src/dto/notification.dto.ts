import { NotificationType } from '../enums';
import { PaginationQuery } from './api-response.dto';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListQuery extends PaginationQuery {}

export interface UnreadCountResponse {
  count: number;
}

export interface CreateConditionAlertRequest {
  spotId: string;
  minWaveHeight?: number;
  maxWindSpeed?: number;
}

export interface UpdateConditionAlertRequest {
  minWaveHeight?: number;
  maxWindSpeed?: number;
  isActive?: boolean;
}

export interface ConditionAlertResponse {
  id: string;
  spotId: string;
  spotName: string;
  minWaveHeight: number | null;
  maxWindSpeed: number | null;
  isActive: boolean;
  createdAt: string;
}
