import { PaginationQuery } from './api-response.dto';

export interface CreateQuestionRequest {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateQuestionRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface QuestionResponse {
  id: string;
  author: QuestionAuthor;
  title: string;
  content: string;
  tags: string[] | null;
  answerCount: number;
  viewCount: number;
  acceptedAnswerId: string | null;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionAuthor {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface QuestionListQuery extends PaginationQuery {
  tag?: string;
  sort?: 'latest' | 'popular' | 'unanswered';
  search?: string;
}
