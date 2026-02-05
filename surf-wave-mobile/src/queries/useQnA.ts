import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { qnaApi, CreateQuestionData } from '../api/qna.api';
import { queryKeys } from './keys';

export const useQuestions = (params?: { tag?: string }) => {
  return useInfiniteQuery({
    queryKey: queryKeys.questions.list(params),
    queryFn: ({ pageParam = 1 }) =>
      qnaApi.getQuestions({ ...params, page: pageParam }).then(res => res.data),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    initialPageParam: 1,
  });
};

export const useQuestion = (questionId: string) => {
  return useQuery({
    queryKey: queryKeys.questions.detail(questionId),
    queryFn: () => qnaApi.getQuestion(questionId).then(res => res.data),
    enabled: !!questionId,
  });
};

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuestionData) => qnaApi.createQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.all });
    },
  });
};

export const useCreateAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, content }: { questionId: string; content: string }) =>
      qnaApi.createAnswer(questionId, { content }),
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.detail(questionId) });
    },
  });
};

export const useAcceptAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, answerId }: { questionId: string; answerId: string }) =>
      qnaApi.acceptAnswer(questionId, answerId),
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questions.detail(questionId) });
    },
  });
};
