import { Trans, useLingui } from '@lingui/react/macro';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownIcon, ArrowRightIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { defined } from '../../server/src/utils';
import { Button } from './components/button';
import { DocumentTitle } from './components/document-title';
import { Field, FieldLabel } from './components/field';
import { Input } from './components/input';
import { Settings } from './components/settings';
import { isLanguage } from './i18n/i18n';
import { options } from './options';
import { ModelSelector } from './session/model-selector';

export function Home() {
  const { t, i18n } = useLingui();
  const language = isLanguage(i18n.locale) ? i18n.locale : 'en';
  const navigate = useNavigate();

  const {
    mutate: createSession,
    isPending: creatingSession,
    variables,
  } = useMutation({
    ...options.sessions.create(language),
    async onSuccess(sessionId, { message }) {
      await navigate(`/session/${sessionId}`, { state: { message } });
    },
  });

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

  const [model, setModel] = useState(import.meta.env.VITE_DEFAULT_MODEL);

  return (
    <div className="col min-h-full flex-1 gap-4 p-4">
      <DocumentTitle />

      <header className="row w-full items-center justify-end gap-3">
        <UserInfo />
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
              autoComplete="off"
              readOnly={creatingSession}
            />
          </Field>

          <Field>
            <FieldLabel>
              <Trans>Model</Trans>
            </FieldLabel>
            <ModelSelector name="model" value={model} onChange={setModel} />
          </Field>

          <div className="col sm:row gap-2 sm:[&>button]:flex-1">
            <Button variant="outlined" size="large" loading={creatingSession && variables.demo} onClick={loadDemo}>
              <Trans>Load demo</Trans>
            </Button>
            <Button type="submit" size="large" loading={creatingSession && !variables.demo}>
              <Trans>Start session</Trans>
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </form>

        <SessionsList />
      </div>

      <footer className="h-32" />
    </div>
  );
}

function UserInfo() {
  const { data: user } = useQuery(options.auth.me());
  const queryClient = useQueryClient();

  const { mutate: logout, isPending } = useMutation({
    ...options.auth.logout(),
    async onSuccess() {
      await queryClient.invalidateQueries();
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="row items-center gap-2">
      <span className="text-dim text-sm">{user.name ?? user.email}</span>
      <Button variant="outlined" size="small" loading={isPending} onClick={() => logout()}>
        <Trans>Sign out</Trans>
      </Button>
    </div>
  );
}

function SessionsList() {
  const { i18n } = useLingui();
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.locale), [i18n.locale]);

  const { data, isSuccess, hasNextPage, fetchNextPage } = useInfiniteQuery(options.sessions.list());

  if (!isSuccess || data.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-dim my-4 text-sm font-medium uppercase">
        <Trans>Previous sessions</Trans>
      </h2>

      <ul className="col gap-2">
        {data.map((session) => (
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

      {hasNextPage && (
        <button type="button" className="text-dim row mt-1 items-center gap-1 text-xs" onClick={() => fetchNextPage()}>
          <Trans>More</Trans>
          <ArrowDownIcon className="size-3 shrink-0" />
        </button>
      )}
    </section>
  );
}
