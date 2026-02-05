import { PaginationQuery } from './api-response.dto';

export interface CreatePostRequest {
  content: string;
  spotId?: string;
  tags?: string[];
  imageUrls?: string[];
}

export interface UpdatePostRequest {
  content?: string;
  tags?: string[];
  imageUrls?: string[];
}

export interface PostResponse {
  id: string;
  author: PostAuthor;
  spotId: string | null;
  spotName: string | null;
  content: string;
  tags: string[] | null;
  images: PostImageResponse[];
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostAuthor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface PostImageResponse {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface PostListQuery extends PaginationQuery {
  spotId?: string;
  tag?: string;
  sort?: 'latest' | 'popular';
  search?: string;
}

export interface ReportPostRequest {
  reason: string;
  description?: string;
}
