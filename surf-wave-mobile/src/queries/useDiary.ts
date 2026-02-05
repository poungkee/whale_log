import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { diaryApi, CreateDiaryData } from '../api/diary.api';
import { queryKeys } from './keys';

export const useDiaries = (params?: { page?: number; limit?: number }) => {
  return useInfiniteQuery({
    queryKey: queryKeys.diary.list(params),
    queryFn: ({ pageParam = 1 }) =>
      diaryApi.getDiaries({ ...params, page: pageParam }).then(res => res.data),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    initialPageParam: 1,
  });
};

export const useDiaryCalendar = (year: number, month: number) => {
  return useQuery({
    queryKey: queryKeys.diary.calendar(year, month),
    queryFn: () => diaryApi.getCalendar({ year, month }).then(res => res.data),
  });
};

export const useDiary = (diaryId: string) => {
  return useQuery({
    queryKey: queryKeys.diary.detail(diaryId),
    queryFn: () => diaryApi.getDiary(diaryId).then(res => res.data),
    enabled: !!diaryId,
  });
};

export const useCreateDiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiaryData) => diaryApi.createDiary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all });
    },
  });
};

export const useUpdateDiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diaryId, data }: { diaryId: string; data: Partial<CreateDiaryData> }) =>
      diaryApi.updateDiary(diaryId, data),
    onSuccess: (_, { diaryId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.detail(diaryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.list() });
    },
  });
};

export const useDeleteDiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (diaryId: string) => diaryApi.deleteDiary(diaryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diary.all });
    },
  });
};
