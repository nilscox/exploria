import { Trans, useLingui } from '@lingui/react/macro';
import { mutationOptions, queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Link, useNavigate, type NavigateFunction } from 'react-router';

import { api } from './api';
import { Button } from './components/button';
import { Field, FieldLabel, fieldProps } from './components/field';
import { Settings } from './components/settings';

function createSessionOptions(navigate: NavigateFunction) {
  return mutationOptions({
    mutationFn: (_message: string) => api.sessions.create(),
    async onSuccess(sessionId, message) {
      await navigate(`/session/${sessionId}`, { state: { message } });
    },
  });
}

function listSessionsOptions() {
  return queryOptions({
    queryKey: ['listSessions'],
    queryFn: () => api.sessions.list(),
  });
}

export function Home() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { mutate: createSession, isPending } = useMutation(createSessionOptions(navigate));

  const listSessionsQuery = useQuery(listSessionsOptions());

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const message = data.get('message') as string;

      createSession(message);
    },
    [createSession],
  );

  return (
    <div className="col h-full flex-1 gap-4 p-4">
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

        <form onSubmit={handleSubmit} className="col bg-neutral gap-4 rounded-md border p-4">
          <Field>
            <FieldLabel>
              <Trans>Session subject</Trans>
            </FieldLabel>
            <input
              name="message"
              placeholder={t`What do you need to think about?`}
              aria-label={t`Subject`}
              readOnly={isPending}
              className="read-only:text-dim bg-neutral rounded-md border px-4 py-2"
              {...fieldProps()}
            />
          </Field>

          <div className="row gap-2">
            <Button type="submit" variant="outlined" size="large" className="flex-1">
              <Trans>Load demo</Trans>
            </Button>
            <Button type="submit" size="large" className="flex-1">
              <Trans>Start session</Trans>
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </form>

        {listSessionsQuery.isSuccess && (
          <div>
            <SessionsList sessions={listSessionsQuery.data} />
          </div>
        )}
      </div>
    </div>
  );
}

function SessionsList({ sessions }: { sessions: Array<{ id: string; date: string; subject: string }> }) {
  const { i18n } = useLingui();
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.locale), [i18n.locale]);

  if (sessions.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-dim my-4 text-sm font-medium uppercase">
        <Trans>Previous sessions</Trans>
      </h2>

      <ul className="col gap-2">
        {sessions.map((session) => (
          <li key={session.id}>
            <Link
              to={`/session/${session.id}`}
              className="hover:bg-accent col block gap-1 rounded-md border p-2 transition-colors"
            >
              <div>{session.subject || <Trans>Sujet à définir</Trans>}</div>
              <div className="text-dim text-xs">{dateFormatter.format(new Date(session.date))}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
