import { api } from '../config/api';

export const commentsApi = {
  getComments: (postId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/community/posts/${postId}/comments`, { params }),

  createComment: (postId: string, data: { content: string; parentId?: string }) =>
    api.post(`/community/posts/${postId}/comments`, data),

  updateComment: (commentId: string, data: { content: string }) =>
    api.patch(`/community/comments/${commentId}`, data),

  deleteComment: (commentId: string) =>
    api.delete(`/community/comments/${commentId}`),
};
