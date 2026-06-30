import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { api } from '../api';
import { Spinner } from '../components/spinner';
import { currentUserQueryOptions } from '../hooks/use-current-user';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: login } = useMutation({
    mutationFn: (token: string) => api.auth.login(token),
    async onSuccess() {
      await queryClient.invalidateQueries(currentUserQueryOptions());
    },
    async onSettled() {
      await navigate('/', { replace: true });
    },
  });

  useEffect(() => {
    const token = params.get('token');

    if (!token) {
      void navigate('/', { replace: true });
    } else {
      login(token);
    }
  }, [login, navigate, params]);

  return (
    <div className="flex h-full items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
