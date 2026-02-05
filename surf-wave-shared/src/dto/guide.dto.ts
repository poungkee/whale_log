import { GuideCategory } from '../enums';

export interface GuideResponse {
  id: string;
  title: string;
  content: string;
  category: GuideCategory;
  thumbnailUrl: string | null;
  sortOrder: number;
  estimatedReadMinutes: number;
  isCompleted?: boolean;
  completedAt?: string | null;
}

export interface GuideListQuery {
  category?: GuideCategory;
}

export interface GuideProgressResponse {
  totalGuides: number;
  completedGuides: number;
  progressPercentage: number;
  categories: CategoryProgress[];
}

export interface CategoryProgress {
  category: GuideCategory;
  total: number;
  completed: number;
}
