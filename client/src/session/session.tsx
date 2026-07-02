import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { mutationOptions, useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeftIcon } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router';

import { options } from 'src/api';
import { Button, LinkButton } from 'src/components/button';
import { Dialog, DialogTrigger } from 'src/components/dialog';
import { DocumentTitle } from 'src/components/document-title';
import { Markdown } from 'src/components/markdown';
import { Settings } from 'src/components/settings';
import { Spinner } from 'src/components/spinner';
import { config } from 'src/contexts/config';

import { SessionInfo } from './info/session-info';
import { MessageForm } from './message-form';
import { SessionMindMap } from './mind-map/session-mind-map';
import { SessionSummaryDialog } from './session-summary';
import { Timeline } from './session-timeline';
import { useSession } from './use-session';

type View = 'main' | 'info' | 'mind-map';

export function SessionPage() {
  const params = useParams<'sessionId'>();
  const sessionId = params.sessionId as string;

  const [state, postMessage, selectPath] = useSession(sessionId);
  const [view, setView] = useState<View>('main');

  if (!state.session) {
    return (
      <div className="col h-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <Layout
      view={view}
      header={<Header session={state.session} view={view} onViewChanged={setView} />}
      aside={<SessionInfo session={state.session} />}
      main={
        <>
          <DocumentTitle title={state.session.subject} />
          <MainSection session={state.session} stream={state.stream} onSelectPath={selectPath} />
          {!state.session.ended && <MessageForm loading={state.loading} postMessage={postMessage} />}
        </>
      }
      right={<SessionMindMap session={state.session} className="size-full" />}
    />
  );
}

function Layout({
  view,
  header,
  aside,
  main,
  right,
}: {
  view: View;
  header: React.ReactNode;
  aside: React.ReactNode;
  main: React.ReactNode;
  right: React.ReactNode;
}) {
  const { width, resizing, startResize } = useResizeColumn({
    initial: (window.innerWidth - 24 * 16) / 3,
    minimum: 16 * 16,
  });

  return (
    <div
      className="grid h-full grid-cols-1 grid-rows-[auto_1fr] overflow-hidden lg:grid-cols-[24rem_1fr_var(--right-col)]"
      style={{ '--right-col': `${width}px` } as React.CSSProperties}
    >
      <header className="lg:col-span-3">{header}</header>

      <aside className={clsx('scrollbar-thin relative min-h-0 overflow-y-auto', view !== 'info' && 'max-lg:hidden')}>
        {aside}
      </aside>

      <main
        className={clsx(
          'min-w-sm scrollbar-thin col relative min-h-0 overflow-y-auto',
          view !== 'main' && 'max-lg:hidden',
        )}
      >
        {main}
      </main>

      <aside className={clsx('relative min-h-0 min-w-xs', view !== 'mind-map' && 'max-lg:hidden')}>
        <ResizeHandle resizing={resizing} onPointerDown={startResize} />
        {right}
      </aside>
    </div>
  );
}

function useResizeColumn({ initial, minimum }: { initial: number; minimum: number }) {
  const [resizing, setResizing] = useState(false);
  const [width, setWidth] = useState(Math.max(initial, minimum));

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();

      setResizing(true);

      const onMove = (moveEvent: PointerEvent) => {
        const width = window.innerWidth - moveEvent.clientX;

        setWidth(Math.min(Math.max(width, minimum), window.innerWidth * 0.6));
      };

      const onUp = () => {
        setResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.userSelect = '';
      };

      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [minimum],
  );

  return {
    width,
    resizing,
    startResize,
  };
}

function ResizeHandle({
  resizing,
  onPointerDown,
}: {
  resizing: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={clsx(
        'absolute inset-y-0 left-0 z-10 hidden w-1.5 -translate-x-1/2 cursor-col-resize transition-colors lg:block hover:bg-primary/40',
        resizing && 'bg-primary/40',
      )}
    />
  );
}

function generateSummaryOptions(sessionId: string, { onError }: { onError: (error: Error) => void }) {
  return mutationOptions({
    ...options.sessions.generateSummary(sessionId),
    onError,
  });
}

function Header({
  session,
  view,
  onViewChanged,
}: {
  session: Shared.Session;
  view: View;
  onViewChanged: (view: View) => void;
}) {
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
    <div className="row flex-wrap items-center gap-x-4 gap-y-0.5 border-b px-4 py-2">
      <div className="row items-center gap-2">
        <LinkButton to="/session" variant="ghost" size="icon" className="shrink-0">
          <ArrowLeftIcon className="size-4" />
        </LinkButton>

        <h1 className="line-clamp-2 font-medium md:text-xl">
          {session.subject ? session.subject : <Trans>Subject to be defined</Trans>}
        </h1>
      </div>

      <div className="row ms-auto items-center gap-1">
        <Button
          variant={view === 'info' ? 'secondary' : 'ghost'}
          size="small"
          onClick={() => onViewChanged(view === 'main' ? 'info' : 'main')}
          className="lg:hidden"
        >
          <Trans>Session info</Trans>
        </Button>

        <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
          <DialogTrigger
            render={
              <Button variant="ghost" size="small" onClick={() => mutate()}>
                <Trans>End session</Trans>
              </Button>
            }
          />

          <SessionSummaryDialog loading={isPending} session={session} summary={data} />
        </Dialog>

        <Settings />
      </div>
    </div>
  );
}

function MainSection({
  session,
  stream,
  onSelectPath,
}: {
  session: Shared.Session;
  stream: string;
  onSelectPath: (pathId: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showTimelineActions, showTimelineDates } = config();

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [stream, session.timeline, showTimelineActions, showTimelineDates]);

  return (
    <>
      <div className="col relative mx-auto w-full max-w-4xl grow gap-4 p-4 sm:p-8">
        <Timeline session={session} onSelectPath={onSelectPath} />
        {stream && <Markdown markdown={stream} />}
      </div>

      <div ref={bottomRef} />
    </>
  );
}
