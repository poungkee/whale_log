import { api } from '../config/api';

export interface CreateDiaryData {
  spotId: string;
  surfDate: string;
  boardType: string;
  durationMinutes: number;
  satisfaction: number;
  memo?: string;
  visibility?: string;
  imageUrls?: string[];
}

export const diaryApi = {
  getDiaries: (params?: { page?: number; limit?: number }) =>
    api.get('/diary', { params }),

  getCalendar: (params: { year: number; month: number }) =>
    api.get('/diary/calendar', { params }),

  getDiary: (diaryId: string) =>
    api.get(`/diary/${diaryId}`),

  createDiary: (data: CreateDiaryData) =>
    api.post('/diary', data),

  updateDiary: (diaryId: string, data: Partial<CreateDiaryData>) =>
    api.patch(`/diary/${diaryId}`, data),

  deleteDiary: (diaryId: string) =>
    api.delete(`/diary/${diaryId}`),

  getPublicDiaries: (params?: { page?: number; limit?: number }) =>
    api.get('/diary/public', { params }),
};
