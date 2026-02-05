import { api } from '../config/api';

export const forecastsApi = {
  getForecast: (spotId: string, params?: { date?: string; hours?: number }) =>
    api.get(`/spots/${spotId}/forecast`, { params }),

  getCurrentForecast: (spotId: string) =>
    api.get(`/spots/${spotId}/forecast/current`),

  getWeeklyForecast: (spotId: string) =>
    api.get(`/spots/${spotId}/forecast/weekly`),
};
