import { api } from '../config/api';

export const guidesApi = {
  getGuides: (params?: { category?: string }) =>
    api.get('/guides', { params }),

  getGuide: (guideId: string) =>
    api.get(`/guides/${guideId}`),

  completeGuide: (guideId: string) =>
    api.post(`/guides/${guideId}/complete`),

  getProgress: () =>
    api.get('/guides/progress'),
};
