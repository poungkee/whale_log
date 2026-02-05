import { api } from '../config/api';

export interface CreateAlertData {
  spotId: string;
  minWaveHeight?: number;
  maxWindSpeed?: number;
}

export const notificationsApi = {
  getNotifications: (params?: { page?: number; limit?: number }) =>
    api.get('/notifications', { params }),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  markAsRead: (notificationId: string) =>
    api.patch(`/notifications/${notificationId}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/read-all'),

  getConditionAlerts: () =>
    api.get('/condition-alerts'),

  createConditionAlert: (data: CreateAlertData) =>
    api.post('/condition-alerts', data),

  updateConditionAlert: (alertId: string, data: Partial<CreateAlertData & { isActive: boolean }>) =>
    api.patch(`/condition-alerts/${alertId}`, data),

  deleteConditionAlert: (alertId: string) =>
    api.delete(`/condition-alerts/${alertId}`),
};
