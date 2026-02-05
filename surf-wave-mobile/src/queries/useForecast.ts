import { useQuery } from '@tanstack/react-query';
import { forecastsApi } from '../api/forecasts.api';
import { queryKeys } from './keys';

export const useCurrentForecast = (spotId: string) => {
  return useQuery({
    queryKey: queryKeys.forecasts.current(spotId),
    queryFn: () => forecastsApi.getCurrentForecast(spotId).then(res => res.data),
    enabled: !!spotId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useHourlyForecast = (spotId: string, date?: string) => {
  return useQuery({
    queryKey: queryKeys.forecasts.hourly(spotId, date),
    queryFn: () => forecastsApi.getForecast(spotId, { date }).then(res => res.data),
    enabled: !!spotId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useWeeklyForecast = (spotId: string) => {
  return useQuery({
    queryKey: queryKeys.forecasts.weekly(spotId),
    queryFn: () => forecastsApi.getWeeklyForecast(spotId).then(res => res.data),
    enabled: !!spotId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};
