import { Trans, useLingui } from '@lingui/react/macro';
import { infiniteQueryOptions, mutationOptions, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowRightIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, type NavigateFunction } from 'react-router';

import { defined } from '../../server/src/utils';
import { api } from './api';
import { Button } from './components/button';
import { Field, FieldLabel } from './components/field';
import { Input } from './components/input';
import { Settings } from './components/settings';
import { ModelSelector } from './session/model-selector';

function createSessionOptions(navigate: NavigateFunction) {
  return mutationOptions({
    async mutationFn({ model, demo }: { model: string; demo?: boolean; message?: string }) {
      return api.sessions.create({ model, demo });
    },
    async onSuccess(sessionId, { message }) {
      await navigate(`/session/${sessionId}`, { state: { message } });
    },
  });
}

function listSessionsOptions() {
  return infiniteQueryOptions({
    queryKey: ['listSessions'],
    async queryFn({ pageParam }) {
      return api.sessions.list({ page: pageParam, limit: 4 });
    },
    initialPageParam: 1,
    getNextPageParam({ nextPage }) {
      return nextPage;
    },
    select({ pages }) {
      return pages.flatMap((page) => page.items);
    },
  });
}

export function Home() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { mutate: createSession, isPending: creatingSession, variables } = useMutation(createSessionOptions(navigate));

  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const model = data.get('model') as string;
      const message = data.get('message') as string;

      createSession({ model, message });
    },
    [createSession],
  );

  const loadDemo = useCallback(() => {
    const data = new FormData(defined(formRef.current));
    const model = data.get('model') as string;

    createSession({ model, demo: true });
  }, [createSession]);

  const [model, setModel] = useState('claude-opus-4-8');

  return (
    <div className="col min-h-full flex-1 gap-4 p-4">
      <header className="row w-full justify-end">
        <Settings />
      </header>

      <div className="col mx-auto w-full max-w-lg flex-1 justify-center gap-8">
        <div className="text-center">
          <h1 className="my-2 text-2xl font-medium">
            <Trans>Exploria</Trans>
          </h1>
          <div className="text-dim">
            <Trans>Deep thoughts with AI.</Trans>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="col bg-neutral gap-4 rounded-md border p-4">
          <Field>
            <FieldLabel>
              <Trans>Session subject</Trans>
            </FieldLabel>
            <Input
              required
              name="message"
              placeholder={t`What do you need to think about?`}
              readOnly={creatingSession}
            />
          </Field>

          <Field>
            <FieldLabel>
              <Trans>Model</Trans>
            </FieldLabel>
            <ModelSelector name="model" value={model} onChange={setModel} />
          </Field>

          <div className="col sm:row gap-2">
            <Button
              variant="outlined"
              size="large"
              loading={creatingSession && variables.demo}
              onClick={loadDemo}
              className="flex-1"
            >
              <Trans>Load demo</Trans>
            </Button>
            <Button type="submit" size="large" loading={creatingSession && !variables.demo} className="flex-1">
              <Trans>Start session</Trans>
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </form>

        <SessionsList />
      </div>
    </div>
  );
}

function SessionsList() {
  const listSessionsQuery = useInfiniteQuery(listSessionsOptions());
  const { i18n } = useLingui();
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.locale), [i18n.locale]);

  if (!listSessionsQuery.isSuccess || listSessionsQuery.data.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-dim my-4 text-sm font-medium uppercase">
        <Trans>Previous sessions</Trans>
      </h2>

      <ul className="col gap-2">
        {listSessionsQuery.data.map((session) => (
          <li key={session.id}>
            <Link
              to={`/session/${session.id}`}
              className="hover:bg-accent/50 col block gap-1 rounded-md border p-2 transition-colors"
            >
              <div>{session.subject || <Trans>Sujet à définir</Trans>}</div>
              <div className="text-dim text-xs">{dateFormatter.format(new Date(session.date))}</div>
            </Link>
          </li>
        ))}
      </ul>

      {listSessionsQuery.hasNextPage && (
        <button
          type="button"
          className="text-dim row mt-1 items-center gap-1 text-xs"
          onClick={() => listSessionsQuery.fetchNextPage()}
        >
          <Trans>More</Trans>
          <ArrowDownIcon className="size-3 shrink-0" />
        </button>
      )}
    </section>
  );
}
