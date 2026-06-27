import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { mutationOptions, useMutation } from '@tanstack/react-query';
import { ArrowLeftIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router';

import { api } from 'src/api';
import { Button, LinkButton } from 'src/components/button';
import { Dialog, DialogTrigger } from 'src/components/dialog';
import { DocumentTitle } from 'src/components/document-title';
import { Markdown } from 'src/components/markdown';
import { Settings } from 'src/components/settings';
import { Spinner } from 'src/components/spinner';

import { MessageForm } from './message-form';
import { SessionSidebar } from './session-sidebar';
import { SessionSummaryDialog } from './session-summary';
import { Timeline } from './session-timeline';
import { useSession } from './use-session';

export function SessionPage() {
  const params = useParams<'sessionId'>();
  const sessionId = params.sessionId as string;

  const [state, postMessage, selectPath] = useSession(sessionId);

  if (!state.session) {
    return (
      <div className="col h-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="col h-full">
      <DocumentTitle title={state.session.subject} />
      <Header session={state.session} />

      <div className="row flex-1 overflow-hidden">
        <div className="h-full">
          <SessionSidebar session={state.session} />
        </div>

        <div className="col min-w-0 flex-1">
          <MainSection session={state.session} stream={state.stream} onSelectPath={selectPath} />
          <MessageForm loading={state.loading} postMessage={postMessage} />
        </div>
      </div>
    </div>
  );
}

function generateSummaryOptions(sessionId: string, { onError }: { onError: (error: Error) => void }) {
  return mutationOptions({
    mutationKey: ['generateSummary', sessionId],
    mutationFn: () => api.sessions.generateSummary(sessionId),
    onError,
  });
}

function Header({ session }: { session: Shared.Session }) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  const { data, isPending, mutate } = useMutation(
    generateSummaryOptions(session.id, {
      onError: (error) => {
        toast.error(error.message);
        setSummaryOpen(false);
      },
    }),
  );

  return (
    <header className="row items-center justify-between border-b px-4 py-2">
      <div className="row items-center gap-2">
        <LinkButton to="/" variant="ghost" size="icon">
          <ArrowLeftIcon className="size-4" />
        </LinkButton>

        <h1 className="text-xl font-medium">
          {session.subject ? session.subject : <Trans>Subject to be defined</Trans>}
        </h1>
      </div>

      <div className="row items-center gap-2">
        <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
          <DialogTrigger
            render={
              <Button variant="ghost" onClick={() => mutate()}>
                <Trans>End session</Trans>
              </Button>
            }
          />

          <SessionSummaryDialog loading={isPending} session={session} summary={data} />
        </Dialog>

        <Settings />
      </div>
    </header>
  );
}

function MainSection({
  session,
  stream,
  onSelectPath,
}: {
  session: Shared.Session;
  stream?: string;
  onSelectPath: (pathId: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [stream, session.timeline]);

  return (
    <div className="flex-1 scrollbar-thin overflow-y-auto">
      <div className="col relative mx-auto w-full max-w-4xl gap-4 px-6 py-4">
        <Timeline session={session} onSelectPath={onSelectPath} />
        {stream && <Markdown markdown={stream} />}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
