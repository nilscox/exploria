import { Trans, useLingui } from '@lingui/react/macro';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, SettingsIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { options } from 'src/api';
import { Button } from 'src/components/button';
import { Dialog, DialogTrigger } from 'src/components/dialog';
import { DocumentTitle } from 'src/components/document-title';
import { Field, FieldLabel } from 'src/components/field';
import { Textarea } from 'src/components/input';
import { SettingsDialog } from 'src/components/settings';
import { isLanguage } from 'src/i18n';

import Icon from '../../logo.svg?react';
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

  const [model, setModel] = useState(import.meta.env.VITE_DEFAULT_MODEL);
  const textareaRef = useRotatingPlaceholders(6000, 300);

  return (
    <div className="col min-h-full flex-1 gap-4 p-4">
      <DocumentTitle />

      <header className="row w-full items-center justify-end gap-3">
        <UserInfo />

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="ghost" size="icon">
                <SettingsIcon className="size-4" />
              </Button>
            }
          />
          <SettingsDialog />
        </Dialog>
      </header>

      <div className="col mx-auto w-full max-w-lg flex-1 justify-center gap-8">
        <div className="text-center">
          <h1 className="my-2 text-3xl font-semibold">
            <div className="relative -top-1 me-2 inline-block size-6 align-middle">
              <Icon className="shrink-0" />
            </div>
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
            <Textarea
              ref={textareaRef}
              required
              readOnly={creatingSession}
              name="message"
              rows={2}
              autoComplete="off"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              className="placeholder:opacity-(--placeholder-opacity) placeholder:transition-opacity placeholder:duration-300"
            />
          </Field>

          <Field>
            <FieldLabel>
              <Trans>Model</Trans>
            </FieldLabel>
            <ModelSelector name="model" value={model} onChange={setModel} />
          </Field>

          <div className="col sm:row gap-2 sm:[&>button]:flex-1">
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

function useRotatingPlaceholders(rotateMs: number, fadeMs: number) {
  const { t } = useLingui();

  const placeholders = useMemo(() => {
    const placeholders: [string, ...string[]] = [
      // Founders
      t`I need to clarify a product vision`,
      t`I'm wondering whether now is the right time to raise funds`,
      t`Should I pivot or stick with my current product?`,
      t`I hesitate to accept an acquisition offer`,

      // Career
      t`I have a stable job but I'm deeply bored`,
      t`Should I go back to school at 40?`,
      t`I have two job offers and I need help choosing one`,
      t`I should confront my manager over their behavior`,

      // Consultants
      t`I want to pressure-test my recommendation before I present it`,
      t`I have to convince a committee but I doubt my argument`,

      // Writing
      t`I'm trying to untangle what I really think about freedom`,
      t`I'm stuck on the central thesis of my essay`,

      // Ethics
      t`Do we have a duty to tell the truth?`,
      t`Do we have a responsibility to future generations?`,
      t`Can I stay friends with someone whose choices I disapprove of?`,
      t`Is it selfish not to want children?`,
      t`Should I forgive someone who won't apologize?`,

      // Life choices
      t`I'm hesitating about moving to London`,
      t`How do I know if it's the right time to have a child?`,
      t`Should I tell a friend a truth that will hurt them?`,
      t`I'm afraid of regretting a choice I haven't even made yet`,

      // Society
      t`I don't know what to think about nuclear energy`,
      t`What should I really think about artificial intelligence?`,
      t`How far am I willing to change my lifestyle for the planet?`,
      t`I need to decide who to vote for in the next election`,

      // Introspection
      t`Why do I procrastinate so much?`,
      t`I want to understand why I say yes to everything`,
    ];

    placeholders.sort(() => Math.random() - 0.5);

    return placeholders;
  }, [t]);

  return useCallback(
    (element: HTMLTextAreaElement) => {
      if (!element) {
        return;
      }

      let index = 0;
      let timeout: number | undefined = undefined;

      const rotate = () => {
        element.placeholder = placeholders[(index = (index + 1) % placeholders.length)]!;
        element.style.setProperty('--placeholder-opacity', '1');

        timeout = window.setTimeout(() => {
          element.style.setProperty('--placeholder-opacity', '0');
        }, rotateMs - fadeMs);
      };

      const interval = window.setInterval(rotate, rotateMs);

      rotate();

      return () => {
        window.clearInterval(interval);

        if (timeout! == undefined) {
          window.clearTimeout(timeout);
        }
      };
    },
    [rotateMs, fadeMs, placeholders],
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
      <span className="text-dim text-sm">{user.name}</span>
      <Button variant="outlined" size="small" loading={isPending} onClick={() => logout()}>
        <Trans>Sign out</Trans>
      </Button>
    </div>
  );
}
