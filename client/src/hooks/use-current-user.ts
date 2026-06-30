import { queryOptions, useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: ['auth', 'me'],
    queryFn: () => api.auth.me(),
  });
}

export function useCurrentUser() {
  const { data: user } = useQuery(currentUserQueryOptions());

  return user ?? null;
}
