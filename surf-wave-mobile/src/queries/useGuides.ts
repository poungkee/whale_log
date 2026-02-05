import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guidesApi } from '../api/guides.api';
import { queryKeys } from './keys';

export const useGuides = (category?: string) => {
  return useQuery({
    queryKey: queryKeys.guides.list(category),
    queryFn: () => guidesApi.getGuides({ category }).then(res => res.data),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useGuide = (guideId: string) => {
  return useQuery({
    queryKey: queryKeys.guides.detail(guideId),
    queryFn: () => guidesApi.getGuide(guideId).then(res => res.data),
    enabled: !!guideId,
  });
};

export const useGuideProgress = () => {
  return useQuery({
    queryKey: queryKeys.guides.progress(),
    queryFn: () => guidesApi.getProgress().then(res => res.data),
  });
};

export const useCompleteGuide = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guideId: string) => guidesApi.completeGuide(guideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guides.progress() });
    },
  });
};
