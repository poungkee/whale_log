import { PaginationQuery } from './api-response.dto';

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentResponse {
  id: string;
  postId: string;
  author: CommentAuthor;
  parentId: string | null;
  content: string;
  likeCount: number;
  depth: number;
  replies?: CommentResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentAuthor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface CommentListQuery extends PaginationQuery {
  sort?: 'latest' | 'oldest';
}
