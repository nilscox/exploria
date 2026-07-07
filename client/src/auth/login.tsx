import { useLingui } from '@lingui/react/macro';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router';

import { options } from 'src/api';
import { Spinner } from 'src/components/spinner';

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLingui();

  const { mutate: login } = useMutation({
    ...options.auth.login(),
    async onSuccess({ name }) {
      toast.success(t`Welcome ${name}, are now authenticated.`);
      await queryClient.invalidateQueries(options.auth.me());
    },
    async onSettled() {
      await navigate('/session', { replace: true });
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
