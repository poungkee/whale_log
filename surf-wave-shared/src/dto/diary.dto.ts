import { BoardType, Visibility, WindDirection } from '../enums';
import { PaginationQuery } from './api-response.dto';

export interface CreateDiaryRequest {
  spotId: string;
  surfDate: string;
  boardType: BoardType;
  durationMinutes: number;
  satisfaction: number;
  memo?: string;
  visibility?: Visibility;
  imageUrls?: string[];
}

export interface UpdateDiaryRequest {
  boardType?: BoardType;
  durationMinutes?: number;
  satisfaction?: number;
  memo?: string;
  visibility?: Visibility;
  imageUrls?: string[];
}

export interface DiaryResponse {
  id: string;
  userId: string;
  spotId: string;
  spotName: string;
  surfDate: string;
  boardType: BoardType;
  durationMinutes: number;
  satisfaction: number;
  memo: string | null;
  visibility: Visibility;
  images: DiaryImageResponse[];
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null;
  windDirection: WindDirection | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryImageResponse {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface DiaryListQuery extends PaginationQuery {
  spotId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DiaryCalendarQuery {
  year: number;
  month: number;
}

export interface DiaryCalendarResponse {
  date: string;
  count: number;
  spotNames: string[];
}
