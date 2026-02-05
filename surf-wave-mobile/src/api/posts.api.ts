import { api } from '../config/api';

export interface CreatePostData {
  content: string;
  spotId?: string;
  tags?: string[];
  imageUrls?: string[];
}

export interface PostQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'recent' | 'popular';
  spotId?: string;
}

export const postsApi = {
  getPosts: (params?: PostQueryParams) =>
    api.get('/community/posts', { params }),

  getPost: (postId: string) =>
    api.get(`/community/posts/${postId}`),

  createPost: (data: CreatePostData) =>
    api.post('/community/posts', data),

  updatePost: (postId: string, data: Partial<CreatePostData>) =>
    api.patch(`/community/posts/${postId}`, data),

  deletePost: (postId: string) =>
    api.delete(`/community/posts/${postId}`),

  toggleLike: (postId: string) =>
    api.post(`/community/posts/${postId}/like`),

  toggleBookmark: (postId: string) =>
    api.post(`/community/posts/${postId}/bookmark`),

  reportPost: (postId: string, data: { reason: string; description?: string }) =>
    api.post(`/community/posts/${postId}/report`, data),

  getBookmarks: (params?: { page?: number; limit?: number }) =>
    api.get('/community/bookmarks', { params }),
};
