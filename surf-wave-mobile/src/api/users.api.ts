import { api } from '../config/api';

export const usersApi = {
  getMe: () => api.get('/users/me'),

  updateProfile: (data: { nickname?: string; bio?: string; avatarUrl?: string; surfLevel?: string }) =>
    api.patch('/users/me', data),

  updateFcmToken: (fcmToken: string) =>
    api.patch('/users/me/fcm-token', { fcmToken }),

  getMyStats: () => api.get('/users/me/stats'),

  getUser: (userId: string) => api.get(`/users/${userId}`),
};
