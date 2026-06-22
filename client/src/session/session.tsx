import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import { mutationOptions, queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { current, produce } from 'immer';
import { ArrowLeftIcon, Loader2Icon, SendIcon } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { api, ApiError } from 'src/api';
import { Button, LinkButton } from 'src/components/button';
import { Field, FieldLabel } from 'src/components/field';
import { Settings } from 'src/components/settings';
import { Details } from 'src/details';
import { Markdown } from 'src/markdown';
import { assert, exhaustiveArray } from 'src/utils';

import { ModelSelector } from './model-selector';
import { Timer } from './timer';
import { TopicsList } from './topics-list';

type AssistantUiEvent = Shared.AssistantUiEvent;

type Session = Shared.Session;
type Timer = Shared.Timer;
type Message = Shared.Message;
type SessionEvent = Shared.SessionEvent;
type GetSessionEvent<Type extends SessionEvent['type']> = Extract<SessionEvent, { type: Type }>;
type SessionUiEvent = Shared.SessionUiEvent;

export function SessionPage() {
  const params = useParams<'sessionId'>();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [state, postMessage] = useSession(
    params.sessionId as string,
    useCallback((event) => {
      if (event.type === 'EventEmitted' && event.event.type === 'MessageAdded' && event.event.message.role === 'user') {
        assert(textAreaRef.current);
        textAreaRef.current.value = '';
      }
    }, []),
  );

  if (!state.session) {
    return (
      <div className="col h-full items-center justify-center">
        <Loader2Icon className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="col h-full">
      <Header session={state.session} />

      <div className="row flex-1 overflow-hidden">
        <div className="h-full">
          <Sidebar session={state.session} />
        </div>

        <div className="col flex-1">
          <MainSection session={state.session} stream={state.stream} />
          <MessageForm textAreaRef={textAreaRef} loading={state.loading} postMessage={postMessage} />
        </div>
      </div>
    </div>
  );
}

const sessionUiEventTypes = exhaustiveArray<AssistantUiEvent['type'] | SessionUiEvent['type']>()([
  'Chunk',
  'SessionChanged',
  'EventEmitted',
] as const);

function getSessionOptions(sessionId: string) {
  return queryOptions({
    queryKey: ['getSession', sessionId],
    queryFn: () => api.sessions.get(sessionId),
  });
}

function useSession(sessionId: string, onEvent: (event: SessionUiEvent) => void) {
  const location = useLocation();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(reducer, {});

  const sessionQuery = useQuery(getSessionOptions(sessionId));
  const { mutate: postMessage } = useMutation(postMessageOptions(sessionId, dispatch));

  useEffect(() => {
    if (ApiError.is(sessionQuery.error) && sessionQuery.error.status === 404) {
      void navigate('/');
    }
  }, [sessionQuery.error, navigate]);

  useEffect(() => {
    if (sessionQuery.isSuccess) {
      dispatch({
        type: 'SessionFetched',
        session: sessionQuery.data,
      });
    }
  }, [sessionQuery.isSuccess, sessionQuery.data]);

  const hasSession = Boolean(state.session);

  useEffect(() => {
    if (!hasSession) {
      return;
    }

    const source = api.sessions.stream(sessionId);

    source.addEventListener('open', () => {
      dispatch({ type: 'StreamOpened' });
    });

    source.addEventListener('error', (event) => {
      console.error('Stream error', event);
      dispatch({ type: 'StreamError' });
    });

    for (const type of sessionUiEventTypes) {
      source.addEventListener(type, ({ data }) => {
        const event: SessionUiEvent = { type, ...JSON.parse(data) };

        dispatch(event);
        onEvent(event);
      });
    }

    return () => {
      source.close();
    };
  }, [hasSession, sessionId, onEvent]);

  useEffect(() => {
    if (typeof location.state?.message === 'string' && state.connected) {
      postMessage(location.state.message);
      void navigate({}, { state: {}, replace: true });
    }
  }, [state.connected, location.state, postMessage, navigate]);

  return [state, postMessage] as const;
}

function postMessageOptions(
  sessionId: string,
  dispatch: React.ActionDispatch<[{ type: 'PostingMessage' | 'MessagePosted' }]>,
) {
  return mutationOptions({
    mutationFn: (text: string) => api.sessions.postMessage(sessionId, text),
    onMutate: () => dispatch({ type: 'PostingMessage' }),
    onSettled: () => dispatch({ type: 'MessagePosted' }),
  });
}

const reducer = produce(function (
  state: {
    session?: Session;
    stream?: string;
    loading?: boolean;
    connected?: boolean;
    prompt?: string;
  },
  action:
    | { type: 'SessionFetched'; session: Session }
    | { type: 'StreamOpened' }
    | { type: 'StreamError' }
    | { type: 'PostingMessage' }
    | { type: 'MessagePosted' }
    | SessionUiEvent
    | AssistantUiEvent,
) {
  console.groupCollapsed(action.type + (action.type === 'EventEmitted' ? ' ' + action.event.type : ''));
  console.log('state\n', current(state));
  console.log('action\n', action);

  if (action.type === 'EventEmitted') {
    console.log('event\n', action.event);
  }

  if (action.type === 'SessionFetched') {
    state.session = action.session;
  }

  if (action.type === 'StreamOpened') {
    state.connected = true;
  }

  if (action.type === 'PostingMessage') {
    state.loading = true;
    state.stream = '';
  }

  if (action.type === 'MessagePosted') {
    state.loading = false;
  }

  if (action.type === 'Chunk') {
    assert(state.stream !== undefined);
    state.stream = state.stream + action.text;
  }

  if (action.type === 'SessionChanged') {
    assert(state.session);
    Object.assign(state.session, action.changes);
  }

  if (action.type === 'EventEmitted') {
    assert(state.session);
    state.session.events.push(action.event);

    const event = action.event;

    if (event.type === 'MessageAdded' && event.message.role === 'assistant' && event.message.content) {
      delete state.stream;
    }

    if (event.type === 'MessageAdded' && event.message.role === 'user') {
      state.prompt = '';
    }
  }

  console.log('state\n', current(state));
  console.groupEnd();
});

function Header({ session }: { session: Session }) {
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

function Sidebar({ session }: { session: Session }) {
  const { mutate: onPause } = useMutation(pauseTimerOptions(session.id));
  const { mutate: onResume } = useMutation(resumeTimerOptions(session.id));

  return (
    <aside className="col sticky top-0 w-64 gap-6 p-2 lg:w-92">
      <Timer timer={session.timer} onStart={() => {}} onPause={onPause} onResume={onResume} onClear={() => {}} />
      <ModelSelectorSection session={session} />
      <TopicsList topics={session.topics} onAdd={() => {}} />

      {session.notes.length > 0 && (
        <section>
          <h2 className="my-4 text-lg font-semibold">Notes</h2>

          <ul className="col gap-2">
            {session.notes.map((note) => (
              <li key={note.id} className="bg-accent rounded-md p-2">
                <Markdown markdown={note.content} title={note.content} className="line-clamp-2" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

function ModelSelectorSection({ session }: { session: Session }) {
  const modelsQuery = useQuery(listModelsOptions());
  const { mutate: setModel } = useMutation(setModelOptions(session.id));

  if (modelsQuery.isError) {
    return <>Error while loading models: {modelsQuery.error.message}</>;
  }

  return (
    <section>
      <Field>
        <FieldLabel className="text-dim text-xs font-medium uppercase">
          <Trans>Model</Trans>
        </FieldLabel>
        <ModelSelector models={modelsQuery.data ?? []} value={session.model} onChange={setModel} />
      </Field>
    </section>
  );
}

function listModelsOptions() {
  return queryOptions({
    queryKey: ['listModels'],
    async queryFn(): Promise<string[]> {
      const mock = false;

      if (mock) {
        return ['gpt-5', 'mistral-small-3.2-24b-instruct'];
      }

      const res = await fetch('https://api.mammouth.ai/public/models');

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const { data }: { data: Array<{ id: string }> } = await res.json();

      return data.map(({ id }) => id);
    },
  });
}

function setModelOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: (model: string) => api.sessions.setModel(sessionId, model),
  });
}

function pauseTimerOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: () => api.sessions.pauseTimer(sessionId),
  });
}

function resumeTimerOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: () => api.sessions.resumeTimer(sessionId),
  });
}

function MainSection({ session, stream }: { session: Session; stream?: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [stream, session.events]);

  return (
    <div className="flex-1 scrollbar-thin overflow-y-auto">
      <div className="col relative mx-auto w-full max-w-4xl gap-4 p-4">
        <Events events={session.events} />
        {stream && <Message message={{ role: 'assistant', date: new Date().toISOString(), content: stream }} />}
      </div>

      <div className="to-background sticky inset-x-0 bottom-0 -my-4 h-4 bg-linear-to-b from-transparent" />

      <div ref={bottomRef} />
    </div>
  );
}

function MessageForm({
  textAreaRef,
  loading,
  postMessage,
}: {
  textAreaRef: React.Ref<HTMLTextAreaElement>;
  loading?: boolean;
  postMessage: (message: string) => void;
}) {
  const { t } = useLingui();

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const message = data.get('message') as string;

      postMessage(message);
    },
    [postMessage],
  );

  const handleKeyDown = useCallback<React.KeyboardEventHandler<HTMLTextAreaElement>>((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }, []);

  return (
    <section className="mx-auto w-full max-w-4xl p-4">
      <form onSubmit={handleSubmit} className="row items-stretch gap-4">
        <textarea
          ref={textAreaRef}
          rows={1}
          name="message"
          readOnly={loading}
          onKeyDown={handleKeyDown}
          aria-label={t`Message`}
          placeholder={t`Type a message...`}
          onInput={({ currentTarget: ref }) => {
            ref.style.height = 'auto';
            ref.style.height = ref.scrollHeight + 1 + 'px';
          }}
          className="read-only:text-dim bg-neutral block w-full rounded-md border p-2"
        />
        <Button type="submit">
          <SendIcon className="size-4" />
        </Button>
      </form>

      <span className="text-dim text-xs">
        <Trans>Enter to send &bull; Shift+Enter for new line</Trans>
      </span>
    </section>
  );
}

function TopicAddedEvent({ event }: { event: GetSessionEvent<'TopicAdded'> }) {
  return <div className="text-dim text-sm">Sujet ajouté : {event.topic.label}</div>;
}

function TimerStartedEvent({ event }: { event: GetSessionEvent<'TimerStarted'> }) {
  return <div className="text-dim text-sm">Chronomètre démarré : {event.duration} minutes</div>;
}

function TimerClearedEvent() {
  return <div className="text-dim text-sm">Chronomètre annulé</div>;
}

function TimerPausedEvent() {
  return <div className="text-dim text-sm">Chronomètre mis en pause</div>;
}

function TimerResumedEvent() {
  return <div className="text-dim text-sm">Chronomètre redémarré</div>;
}

function MessageAddedEvent({ event }: { event: GetSessionEvent<'MessageAdded'> }) {
  const { message } = event;

  if (message.role === 'system') {
    return (
      <Details className="text-dim text-sm" summary="System prompt">
        <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </Details>
    );
  }

  return (
    <>
      <Message message={event.message} />

      {message.role === 'assistant' &&
        message.toolCalls?.map((toolCall) => (
          <Details
            key={toolCall.id}
            className="text-dim text-sm"
            summary={`Tool call ${toolCall.name} (${toolCall.id})`}
          >
            <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </div>

            {Boolean(toolCall.result) && (
              <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
                {JSON.stringify(toolCall.result, null, 2)}
              </div>
            )}

            {Boolean(toolCall.error) && (
              <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
                {JSON.stringify(toolCall.error, null, 2)}
              </div>
            )}
          </Details>
        ))}
    </>
  );
}

const sessionEventMap: { [Event in SessionEvent as Event['type']]: React.ComponentType<{ event: Event }> } = {
  ModelChanged: () => null,
  PlanInitialized: () => null,
  SubjectChanged: () => null,
  TopicAdded: TopicAddedEvent,
  TopicRemoved: () => null,
  TopicLabelChanged: () => null,
  TopicStatusChanged: () => null,
  NoteAdded: () => null,
  NoteRemoved: () => null,
  NoteContentChanged: () => null,
  TimerStarted: TimerStartedEvent,
  TimerCleared: TimerClearedEvent,
  TimerPaused: TimerPausedEvent,
  TimerResumed: TimerResumedEvent,
  MessageAdded: MessageAddedEvent,
  DiscussionPathsSet: () => null,
  DiscussionPathSelected: () => null,
};

function Events({ events }: { events: SessionEvent[] }) {
  return events.map((event, index) => {
    const Component = sessionEventMap[event.type] as React.ComponentType<{ event: SessionEvent }>;
    return <Component key={index} event={event} />;
  });
}

function Message({ message }: { message: Omit<Message, 'id'> }) {
  return (
    <Markdown
      markdown={message.content}
      className={clsx(message.role === 'user' && 'bg-accent px-4 py-2 rounded-md')}
    />
  );
}
