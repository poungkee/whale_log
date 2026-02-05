import { api } from '../config/api';

export const authApi = {
  register: (data: { firebaseToken: string; nickname: string; email: string }) =>
    api.post('/auth/register', data),

  login: (firebaseToken: string) =>
    api.post('/auth/login', { firebaseToken }),

  withdraw: () =>
    api.delete('/auth/withdraw'),
};
