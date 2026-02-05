import { api } from '../config/api';

export interface CreateQuestionData {
  title: string;
  content: string;
  tags?: string[];
}

export const qnaApi = {
  getQuestions: (params?: { page?: number; limit?: number; tag?: string }) =>
    api.get('/qna/questions', { params }),

  getQuestion: (questionId: string) =>
    api.get(`/qna/questions/${questionId}`),

  createQuestion: (data: CreateQuestionData) =>
    api.post('/qna/questions', data),

  updateQuestion: (questionId: string, data: Partial<CreateQuestionData>) =>
    api.patch(`/qna/questions/${questionId}`, data),

  deleteQuestion: (questionId: string) =>
    api.delete(`/qna/questions/${questionId}`),

  createAnswer: (questionId: string, data: { content: string }) =>
    api.post(`/qna/questions/${questionId}/answers`, data),

  updateAnswer: (answerId: string, data: { content: string }) =>
    api.patch(`/qna/answers/${answerId}`, data),

  deleteAnswer: (answerId: string) =>
    api.delete(`/qna/answers/${answerId}`),

  acceptAnswer: (questionId: string, answerId: string) =>
    api.post(`/qna/questions/${questionId}/accept/${answerId}`),
};
