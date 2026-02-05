import { api } from '../config/api';

export interface SpotQueryParams {
  region?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
}

export interface NearbyQueryParams {
  lat: number;
  lng: number;
  radius?: number;
}

export const spotsApi = {
  getSpots: (params?: SpotQueryParams) =>
    api.get('/spots', { params }),

  getNearbySpots: (params: NearbyQueryParams) =>
    api.get('/spots/nearby', { params }),

  getSpot: (spotId: string) =>
    api.get(`/spots/${spotId}`),

  getVotes: (spotId: string) =>
    api.get(`/spots/${spotId}/votes`),

  vote: (spotId: string, voteType: string) =>
    api.post(`/spots/${spotId}/vote`, { voteType }),

  getFavorites: () =>
    api.get('/spots/favorites'),

  addFavorite: (spotId: string) =>
    api.post(`/spots/${spotId}/favorite`),

  removeFavorite: (spotId: string) =>
    api.delete(`/spots/${spotId}/favorite`),
};
