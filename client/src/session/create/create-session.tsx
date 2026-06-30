import { Trans, useLingui } from '@lingui/react/macro';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { options } from 'src/api';
import { Button } from 'src/components/button';
import { DocumentTitle } from 'src/components/document-title';
import { Field, FieldLabel } from 'src/components/field';
import { Input } from 'src/components/input';
import { Settings } from 'src/components/settings';
import { isLanguage } from 'src/i18n/i18n';
import { assert } from 'src/utils';

import { ModelSelector } from '../model-selector';
import { SessionsList } from './sessions-list';

export function CreateSession() {
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
  const { data: user } = useQuery(options.auth.me());

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      if (!user && !confirm(t`This session will be publicly available. Do not share sensitive information.`)) {
        return;
      }

      const data = new FormData(event.target);
      const model = data.get('model') as string;
      const message = data.get('message') as string;

      createSession({ model, message });
    },
    [createSession, user, t],
  );

  const loadDemo = useCallback(() => {
    assert(formRef.current);

    const data = new FormData(formRef.current);
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
          <h1 className="my-2 text-3xl font-semibold">
            <Trans>
              Explor<span className="text-primary">ia</span>
            </Trans>
          </h1>
          <div className="text-dim">
            <Trans>Thinking assistant</Trans>
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
