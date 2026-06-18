import type { Shared } from '@exploria/server/shared';
import { mutationOptions, queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { add, intervalToDuration } from 'date-fns';
import { current, produce } from 'immer';
import { ArrowRightIcon, CheckIcon, Loader2Icon, PauseIcon, PlayIcon } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { api, ApiError } from './api';
import { Details } from './details';
import { useNow } from './hooks/use-now';
import { Markdown } from './markdown';
import { assert, exhaustiveArray } from './utils';

type AssistantUiEvent = Shared.AssistantUiEvent;

type Session = Shared.Session;
type Timer = Shared.Timer;
type Message = Shared.Message;
type SessionEvent = Shared.SessionEvent;
type GetSessionEvent<Type extends SessionEvent['type']> = Extract<SessionEvent, { type: Type }>;
type SessionUiEvent = Shared.SessionUiEvent;

export function SessionPage() {
  const params = useParams<'sessionId'>();

  const [state, postMessage] = useSession(
    params.sessionId as string,
    useCallback((event) => {
      if (
        event.type === 'EventEmitted' &&
        event.event.type === 'MessageAdded' &&
        event.event.message.role === 'user' &&
        textareaRef.current
      ) {
        textareaRef.current.value = '';
      }
    }, []),
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [state.stream, state.session?.events]);

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

  if (!state.session) {
    return (
      <div className="h-full col items-center justify-center">
        <Loader2Icon className="animate-spin size-8" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 col h-full py-4">
      <header className="border-b py-4 row justify-between items-center">
        <h1 className="text-xl font-medium">{state.session.subject ? state.session.subject : 'Sujet à définir'}</h1>
        <ModelSelector session={state.session} />
      </header>

      <div className="flex-1 row gap-8 overflow-hidden">
        <div className="h-full">
          <Info session={state.session} />
        </div>
        <div className="col flex-1">
          <div className="flex-1 overflow-y-auto col gap-4 py-8 px-2 scrollbar-thin scrollbar-thumb-zinc-600">
            <Events events={state.session.events} />
            {state.stream && (
              <Message
                message={{
                  role: 'assistant',
                  date: new Date().toISOString(),
                  content: state.stream,
                }}
              />
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              name="message"
              rows={4}
              readOnly={state.loading}
              onKeyDown={handleKeyDown}
              aria-label="Message"
              className="border rounded-md block w-full p-2 bg-zinc-800 read-only:text-dim"
            />
          </form>
        </div>
      </div>
    </div>
  );
}

const sessionUiEventTypes = exhaustiveArray<AssistantUiEvent['type'] | SessionUiEvent['type']>()([
  'Chunk',
  'ModelChanged',
  'SubjectChanged',
  'TopicsChanged',
  'NotesChanged',
  'TimerChanged',
  'EventEmitted',
] as const);

function getSessionOptions(sessionId: string) {
  return queryOptions({
    queryKey: ['getSession', sessionId],
    queryFn: () => api.sessions.get(sessionId),
  });
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
      dispatch({ type: 'error' });
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

const reducer = produce(function (
  state: {
    session?: Session;
    stream?: string;
    loading?: boolean;
    connected?: boolean;
  },
  action:
    | { type: 'error' }
    | { type: 'SessionFetched'; session: Session }
    | { type: 'StreamOpened' }
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

  if (action.type === 'error') {
    state.loading = false;
    delete state.stream;
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

  if (action.type === 'SubjectChanged') {
    assert(state.session);
    state.session.subject = action.subject;
  }

  if (action.type === 'TopicsChanged') {
    assert(state.session);
    state.session.topics = action.topics;
  }

  if (action.type === 'NotesChanged') {
    assert(state.session);
    state.session.notes = action.notes;
  }

  if (action.type === 'TimerChanged') {
    assert(state.session);
    state.session.timer = action.timer;
  }

  if (action.type === 'EventEmitted') {
    assert(state.session);
    state.session.events.push(action.event);

    const event = action.event;

    if (event.type === 'MessageAdded' && event.message.role === 'assistant' && event.message.content) {
      delete state.stream;
    }
  }

  console.log('state\n', current(state));
  console.groupEnd();
});

function Info({ session }: { session: Session }) {
  return (
    <div className="sticky top-0 w-64 col gap-6">
      {session.timer && (
        <section>
          <h2 className="my-4 text-lg font-semibold">Temps</h2>
          <div>
            <Timer sessionId={session.id} timer={session.timer} />
          </div>
        </section>
      )}

      {session.topics.length > 0 && (
        <section>
          <h2 className="my-4 text-lg font-semibold">Sujets</h2>

          <ul className="col gap-2">
            {session.topics.map((topic) => (
              <li key={topic.id}>
                <div className={clsx('row gap-2 items-start', { 'text-dim': topic.status !== 'in_progress' })}>
                  <div className="border rounded-sm size-4 shrink-0 mt-1">
                    {topic.status === 'in_progress' && <ArrowRightIcon className="size-full" />}
                    {topic.status === 'done' && <CheckIcon className="size-full" />}
                  </div>

                  {topic.label}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {session.notes.length > 0 && (
        <section>
          <h2 className="my-4 text-lg font-semibold">Notes</h2>

          <ul className="col gap-2">
            {session.notes.map((note) => (
              <li key={note.id} className="p-2 bg-zinc-800 rounded-md">
                <Markdown markdown={note.content} title={note.content} className="line-clamp-2" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function listModelsOptions() {
  return queryOptions({
    queryKey: ['listModels'],
    async queryFn(): Promise<{ data: Array<{ id: string; owned_by: string }> }> {
      const res = await fetch('https://api.mammouth.ai/public/models');

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
  });
}

function setModelOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: (model: string) => api.sessions.setModel(sessionId, model),
  });
}

function ModelSelector({ session }: { session: Session }) {
  const modelsQuery = useQuery(listModelsOptions());
  const { mutate: setModel, isPending } = useMutation(setModelOptions(session.id));

  const handleSubmit = useCallback<React.SubmitEventHandler>(
    (event) => {
      event.preventDefault();

      const formData = new FormData(event.target);
      const model = formData.get('model') as string;

      setModel(model);
    },
    [setModel],
  );

  if (modelsQuery.isPending) {
    return null;
  }

  if (modelsQuery.isError) {
    return <>Error</>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <select
        name="model"
        defaultValue={session.model}
        onChange={(event) => event.target.form?.requestSubmit()}
        disabled={isPending}
        className="border rounded-md px-4 py-2"
      >
        {modelsQuery.data.data.map((model) => (
          <option key={model.id} value={model.id} className="bg-background text-text">
            {model.id} ({model.owned_by})
          </option>
        ))}
      </select>
    </form>
  );
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

function Timer({ sessionId, timer }: { sessionId: string; timer: Timer }) {
  const now = useNow();
  const { hours = 0, minutes = 0, seconds = 0 } = getRemainingTime(timer, now);

  const pauseTimerMutation = useMutation(pauseTimerOptions(sessionId));
  const resumeTimerMutation = useMutation(resumeTimerOptions(sessionId));
  const { mutate: toggle } = timer.pausedAt ? resumeTimerMutation : pauseTimerMutation;

  const Icon = timer.pausedAt ? PlayIcon : PauseIcon;

  return (
    <div className="font-mono inline-flex flex-row gap-4 items-center">
      <button onClick={() => toggle()} type="button">
        <Icon className="size-4 fill-current" />
      </button>
      <span className="leading-none">
        {[hours, minutes, seconds]
          .map((value) => Math.max(0, value))
          .map((value) => String(value).padStart(2, '0'))
          .join(':')}
      </span>
    </div>
  );
}

function getRemainingTime(timer: Timer, now: Date) {
  return intervalToDuration({
    start: timer.pausedAt ?? now,
    end: add(timer.startedAt, { minutes: timer.duration }),
  });
}

function TopicAddedEvent({ event }: { event: GetSessionEvent<'TopicAdded'> }) {
  return <div className="text-sm text-dim">Sujet ajouté : {event.topic.label}</div>;
}

function TimerStartedEvent({ event }: { event: GetSessionEvent<'TimerStarted'> }) {
  return <div className="text-sm text-dim">Chronomètre démarré : {event.duration} minutes</div>;
}

function TimerClearedEvent() {
  return <div className="text-sm text-dim">Chronomètre annulé</div>;
}

function TimerPausedEvent() {
  return <div className="text-sm text-dim">Chronomètre mis en pause</div>;
}

function TimerResumedEvent() {
  return <div className="text-sm text-dim">Chronomètre redémarré</div>;
}

function MessageAddedEvent({ event }: { event: GetSessionEvent<'MessageAdded'> }) {
  const { message } = event;

  if (message.role === 'system') {
    return (
      <Details className="text-dim text-sm" summary="System prompt">
        <div className="mt-2 whitespace-pre-wrap font-mono text-text text-sm p-4 bg-zinc-800 rounded-md">
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
            <div className="mt-2 whitespace-pre-wrap font-mono text-text text-sm p-4 bg-zinc-800 rounded-md">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </div>

            {Boolean(toolCall.result) && (
              <div className="mt-2 whitespace-pre-wrap font-mono text-text text-sm p-4 bg-zinc-800 rounded-md">
                {JSON.stringify(toolCall.result, null, 2)}
              </div>
            )}

            {Boolean(toolCall.error) && (
              <div className="mt-2 whitespace-pre-wrap font-mono text-text text-sm p-4 bg-zinc-800 rounded-md">
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
      className={clsx(message.role === 'user' && 'bg-zinc-800 px-4 py-2 rounded-md')}
    />
  );
}
