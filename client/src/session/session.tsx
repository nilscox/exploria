import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { useMutation } from '@tanstack/react-query';
import {
  ArchiveIcon,
  ArrowLeftIcon,
  MenuIcon,
  MessageSquareIcon,
  PanelLeftIcon,
  SettingsIcon,
  Share2Icon,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router';

import { options } from 'src/api';
import { Button, LinkButton } from 'src/components/button';
import { Dialog } from 'src/components/dialog';
import { DocumentTitle } from 'src/components/document-title';
import { Markdown } from 'src/components/markdown';
import { CheckboxMenuItem, Menu, MenuItem, MenuSeparator } from 'src/components/menu';
import { SettingsDialog } from 'src/components/settings';
import { Spinner } from 'src/components/spinner';
import { config } from 'src/contexts/config';
import { useMediaQuery } from 'src/hooks/use-media-query';

import { SessionInfo } from './info/session-info';
import { MessageForm } from './message-form';
import { SessionMindMap } from './mind-map/session-mind-map';
import { SessionLayout, useSessionLayout, type View } from './session-layout';
import { SessionSummaryDialog } from './session-summary';
import { Timeline } from './session-timeline';
import { useSession } from './use-session';

export function SessionPage() {
  const params = useParams<'sessionId'>();
  const sessionId = params.sessionId as string;

  const [{ layout, views }, setView] = useSessionLayout();
  const [state, postMessage, selectAnswer] = useSession(sessionId);

  if (!state.session) {
    return (
      <div className="col h-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <SessionLayout
      views={views}
      setView={setView}
      header={<Header session={state.session} views={views} setView={setView} />}
      sessionInfo={<SessionInfo session={state.session} />}
      timeline={
        <MainSection
          session={state.session}
          stream={state.stream}
          loading={state.loading}
          postMessage={postMessage}
          selectAnswer={selectAnswer}
        />
      }
      mindMap={
        <SessionMindMap
          session={state.session}
          expanded={layout === 'desktop' ? !views.timeline && views.mindmap : undefined}
          toggleExpanded={() => setView('timeline', !views.timeline)}
        />
      }
    />
  );
}

function Header({
  session,
  views,
  setView,
}: {
  session: Shared.Session;
  views: Record<View, boolean>;
  setView: (view: View, visible: boolean) => void;
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    data,
    isPending,
    mutate: generateSummary,
  } = useMutation({
    ...options.sessions.generateSummary(session.id),
    onError: (error) => {
      toast.error(error.message);
      setSummaryOpen(false);
    },
  });

  const isMobile = useMediaQuery('(width < 64rem)');

  const handleBack: React.MouseEventHandler = (event) => {
    if (isMobile && !views.timeline) {
      event.preventDefault();
      setView('timeline', true);
    }
  };

  return (
    <div className="row items-center justify-between gap-x-4 gap-y-0.5 border-b px-4 py-2">
      <div className="row items-center gap-2">
        <LinkButton to="/session" variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
          <ArrowLeftIcon className="size-4" />
        </LinkButton>

        <h1 className="line-clamp-2 font-medium md:text-xl">
          {session.subject ? session.subject : <Trans>Subject to be defined</Trans>}
        </h1>
      </div>

      <Menu
        trigger={
          <Button variant="ghost" size="icon">
            <MenuIcon className="size-4" />
          </Button>
        }
        className="min-w-50"
      >
        <CheckboxMenuItem
          icon={PanelLeftIcon}
          checked={views.info}
          onCheckedChange={(checked) => setView('info', checked)}
          closeOnClick={isMobile}
        >
          <Trans>Session info</Trans>
        </CheckboxMenuItem>

        <CheckboxMenuItem
          icon={MessageSquareIcon}
          checked={views.timeline}
          onCheckedChange={(checked) => setView('timeline', checked)}
          closeOnClick={isMobile}
        >
          <Trans>Timeline</Trans>
        </CheckboxMenuItem>

        <CheckboxMenuItem
          icon={Share2Icon}
          checked={views.mindmap}
          onCheckedChange={(checked) => setView('mindmap', checked)}
          closeOnClick={isMobile}
        >
          <Trans>Mind map</Trans>
        </CheckboxMenuItem>

        <MenuSeparator />

        <MenuItem
          icon={ArchiveIcon}
          onClick={() => {
            generateSummary();
            setSummaryOpen(true);
          }}
        >
          <Trans>End session</Trans>
        </MenuItem>

        <MenuItem icon={SettingsIcon} onClick={() => setSettingsOpen(true)}>
          <Trans>Settings</Trans>
        </MenuItem>
      </Menu>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <SessionSummaryDialog loading={isPending} session={session} summary={data} />
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SettingsDialog />
      </Dialog>
    </div>
  );
}

function MainSection({
  session,
  stream,
  loading,
  postMessage,
  selectAnswer,
}: {
  session: Shared.Session;
  stream: string;
  loading: boolean;
  postMessage: (message: string) => void;
  selectAnswer: (questionId: string, optionId: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showTimelineActions, showTimelineDates } = config();
  const { tail, scrollToEnd } = useTail(bottomRef);

  useLayoutEffect(() => {
    if (tail) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [tail, stream, session.timeline, showTimelineActions, showTimelineDates]);

  const components = useMemo(() => ({ loading: Loading }), []);

  return (
    <>
      <DocumentTitle title={session.subject} />

      <div className="col relative mx-auto w-full max-w-4xl grow gap-4 p-4 sm:p-8">
        <Timeline session={session} onSelectAnswer={selectAnswer} />
        {stream && <Markdown markdown={stream + ' :loading'} components={components} />}
      </div>

      <div ref={bottomRef} />

      {!session.ended && <MessageForm loading={loading} postMessage={postMessage} scrollToEnd={scrollToEnd} />}
    </>
  );
}

function Loading() {
  return (
    <span className="bg-accent inline-block h-[1.5em] w-4 animate-[pulse_1s_infinite_step-end] rounded-sm align-middle" />
  );
}

function useTail(bottomRef: React.RefObject<HTMLElement | null>) {
  const [tail, setTail] = useState(false);

  useLayoutEffect(() => {
    const parent = bottomRef.current?.parentElement;

    if (!parent) {
      return;
    }

    const listener = () => {
      setTail(parent.scrollHeight <= Math.ceil(parent.scrollTop + parent.clientHeight));
    };

    parent.addEventListener('scroll', listener);

    return () => {
      parent.removeEventListener('scroll', listener);
    };
  }, [bottomRef]);

  return {
    tail,
    scrollToEnd: tail ? undefined : () => setTail(true),
  };
}
