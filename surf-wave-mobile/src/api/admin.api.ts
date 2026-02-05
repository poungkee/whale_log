import { api } from '../config/api';

export const adminApi = {
  getDashboard: () =>
    api.get('/admin/dashboard'),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/users', { params }),

  suspendUser: (userId: string, data: { isSuspended: boolean; suspendedUntil?: string }) =>
    api.patch(`/admin/users/${userId}/suspend`, data),

  updateUserRole: (userId: string, data: { role: string }) =>
    api.patch(`/admin/users/${userId}/role`, data),

  createSpot: (data: any) =>
    api.post('/admin/spots', data),

  updateSpot: (spotId: string, data: any) =>
    api.patch(`/admin/spots/${spotId}`, data),

  deleteSpot: (spotId: string) =>
    api.delete(`/admin/spots/${spotId}`),

  getReports: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/admin/reports', { params }),

  resolveReport: (reportId: string, data: { status: string; adminNote?: string }) =>
    api.patch(`/admin/reports/${reportId}`, data),

  hidePost: (postId: string, data: { isHidden: boolean }) =>
    api.patch(`/admin/posts/${postId}/hide`, data),

  createGuide: (data: any) =>
    api.post('/admin/guides', data),

  updateGuide: (guideId: string, data: any) =>
    api.patch(`/admin/guides/${guideId}`, data),

  broadcastNotification: (data: { title: string; body: string }) =>
    api.post('/admin/notifications/broadcast', data),
};
