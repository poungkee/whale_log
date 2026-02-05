import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users.api';
import { queryKeys } from './keys';

export const useMe = () => {
  return useQuery({
    queryKey: queryKeys.user.me(),
    queryFn: () => usersApi.getMe().then(res => res.data),
  });
};

export const useMyStats = () => {
  return useQuery({
    queryKey: queryKeys.user.stats(),
    queryFn: () => usersApi.getMyStats().then(res => res.data),
  });
};

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.user.detail(userId),
    queryFn: () => usersApi.getUser(userId).then(res => res.data),
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.me() });
    },
  });
};
