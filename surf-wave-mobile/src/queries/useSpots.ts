import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { spotsApi, SpotQueryParams } from '../api/spots.api';
import { queryKeys } from './keys';

export const useSpots = (params?: SpotQueryParams) => {
  return useInfiniteQuery({
    queryKey: queryKeys.spots.list(params),
    queryFn: ({ pageParam = 1 }) =>
      spotsApi.getSpots({ ...params, page: pageParam }).then(res => res.data),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    initialPageParam: 1,
  });
};

export const useNearbySpots = (lat: number, lng: number, radius?: number) => {
  return useQuery({
    queryKey: queryKeys.spots.nearby(lat, lng, radius),
    queryFn: () => spotsApi.getNearbySpots({ lat, lng, radius }).then(res => res.data),
    enabled: !!lat && !!lng,
  });
};

export const useSpot = (spotId: string) => {
  return useQuery({
    queryKey: queryKeys.spots.detail(spotId),
    queryFn: () => spotsApi.getSpot(spotId).then(res => res.data),
    enabled: !!spotId,
  });
};

export const useSpotVotes = (spotId: string) => {
  return useQuery({
    queryKey: queryKeys.spots.votes(spotId),
    queryFn: () => spotsApi.getVotes(spotId).then(res => res.data),
    enabled: !!spotId,
  });
};

export const useFavoriteSpots = () => {
  return useQuery({
    queryKey: queryKeys.spots.favorites(),
    queryFn: () => spotsApi.getFavorites().then(res => res.data),
  });
};

export const useVoteSpot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ spotId, voteType }: { spotId: string; voteType: string }) =>
      spotsApi.vote(spotId, voteType),
    onSuccess: (_, { spotId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spots.votes(spotId) });
    },
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ spotId, isFavorite }: { spotId: string; isFavorite: boolean }) =>
      isFavorite ? spotsApi.removeFavorite(spotId) : spotsApi.addFavorite(spotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spots.favorites() });
    },
  });
};
