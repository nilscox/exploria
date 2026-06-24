import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { ArrowLeftIcon } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { useParams } from 'react-router';

import { Button, LinkButton } from 'src/components/button';
import { Markdown } from 'src/components/markdown';
import { Settings } from 'src/components/settings';
import { Spinner } from 'src/components/spinner';

import { MessageForm } from './message-form';
import { SessionSidebar } from './session-sidebar';
import { Timeline } from './session-timeline';
import { useSession } from './use-session';

export function SessionPage() {
  const params = useParams<'sessionId'>();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [state, postMessage, selectPath] = useSession(params.sessionId as string);

  if (!state.session) {
    return (
      <div className="col h-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="col h-full">
      <Header session={state.session} />

      <div className="row flex-1 overflow-hidden">
        <div className="h-full">
          <SessionSidebar session={state.session} />
        </div>

        <div className="col flex-1">
          <MainSection session={state.session} stream={state.stream} onSelectPath={selectPath} />
          <MessageForm textAreaRef={textAreaRef} loading={state.loading} postMessage={postMessage} />
        </div>
      </div>
    </div>
  );
}

function Header({ session }: { session: Shared.Session }) {
  return (
    <header className="row items-center justify-between border-b px-4 py-2">
      <div className="row items-center gap-2">
        <LinkButton to="/" variant="ghost" size="icon">
          <ArrowLeftIcon className="size-4" />
        </LinkButton>

        <h1 className="text-xl font-medium">
          {session.subject ? session.subject : <Trans>Subject to be define</Trans>}
        </h1>
      </div>

      <div className="row items-center gap-2">
        <Button variant="ghost">
          <Trans>End session</Trans>
        </Button>
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
      <div className="col relative mx-auto w-full max-w-4xl gap-4 p-4">
        <Timeline items={session.timeline} onSelectPath={onSelectPath} />
        {stream && <Markdown markdown={stream} />}
      </div>

      <div className="to-background sticky inset-x-0 bottom-0 -my-4 h-4 bg-linear-to-b from-transparent" />

      <div ref={bottomRef} />
    </div>
  );
}
