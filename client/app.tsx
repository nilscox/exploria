import clsx from 'clsx';
import { add, intervalToDuration } from 'date-fns';
import { current, produce } from 'immer';
import { ArrowRightIcon, CheckIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';

import { serverSentMessageEventTypes, serverSentSessionEventTypes } from '../shared';
import { Details } from './details';
import { useNow } from './hooks/use-now';
import { Markdown } from './markdown';
import { assert } from './utils';

import type {
  GetSessionEvent,
  Message,
  ServerSentMessageEvent,
  ServerSentSessionEvent,
  Session,
  SessionEvent,
  Timer,
} from '../shared';

export function App() {
  const [state, dispatch] = useReducer(reducer, {});

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((session) => dispatch({ type: 'session:fetched', session }))
      .catch(console.error);
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [state.stream, state.session?.events]);

  useEffect(() => {
    const source = new EventSource(`/api/session/stream`);

    source.addEventListener('error', (event) => {
      console.error('Stream error', event);
      dispatch({ type: 'error' });
    });

    for (const type of serverSentSessionEventTypes) {
      source.addEventListener(type, ({ data }) => {
        const event: ServerSentSessionEvent = { type, ...JSON.parse(data) };

        dispatch(event);

        if (event.type === 'session:error') {
          console.error(event.message);
        }

        if (event.type === 'session:messageAdded' && event.message.role === 'user' && textareaRef.current) {
          textareaRef.current.value = '';
        }
      });
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    const source = new EventSource(`/api/session/message?message=${encodeURIComponent(message)}`);

    source.addEventListener('open', () => {
      dispatch({ type: 'message:open' });
    });

    source.addEventListener('message', (event) => {
      console.log('message', event);
    });

    source.addEventListener('error', (event) => {
      console.error('Message error', event);
      dispatch({ type: 'error' });
      source.close();
    });

    for (const type of serverSentMessageEventTypes) {
      source.addEventListener(type, ({ data }) => {
        const event: ServerSentMessageEvent = { type, ...JSON.parse(data) };

        dispatch(event);

        if (event.type === 'message:error') {
          console.error(event.message);
          source.close();
        }

        if (event.type === 'message:done') {
          source.close();
        }
      });
    }

    source.addEventListener('err', ({ data }) => dispatch({ type: 'stream:error', ...JSON.parse(data) }));
    source.addEventListener('chunk', ({ data }) => dispatch({ type: 'stream:chunk', ...JSON.parse(data) }));
  }, []);

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const message = data.get('message') as string;

      sendMessage(message);
    },
    [sendMessage],
  );

  const handleKeyDown = useCallback<React.KeyboardEventHandler<HTMLTextAreaElement>>((event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.currentTarget.form?.requestSubmit();
    }
  }, []);

  if (!state.session) {
    return (
      <div className="max-w-6xl mx-auto px-4 col h-full py-4 justify-center gap-16">
        <header className="text-center">
          <h1 className="my-4 text-4xl font-medium">Exploria</h1>
          <div className="text-dim">L'IA au service de la réflexion.</div>
        </header>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            name="message"
            rows={6}
            placeholder="Quel sujet souhaitez-vous aborder ?"
            readOnly={state.loading}
            onKeyDown={handleKeyDown}
            aria-label="Message"
            className="border rounded-md block w-full p-2 bg-zinc-800 read-only:text-dim"
          />
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 col h-full py-4">
      <header className="border-b py-4">
        {state.session.subject && <h1 className="text-xl font-medium">{state.session.subject}</h1>}
      </header>

      <div className="flex-1 row gap-8 overflow-hidden">
        <div className="h-full">
          <Info session={state.session} />
        </div>
        <div className="col flex-1">
          <div className="flex-1 overflow-y-auto col gap-4 py-8 px-2 scrollbar-thin scrollbar-thumb-zinc-600">
            <Events events={state.session.events} />
            {state.stream && <Message message={{ role: 'assistant', content: state.stream }} />}
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

const reducer = produce(function (
  state: {
    session?: Session;
    stream?: string;
    loading?: boolean;
  },
  action:
    | { type: 'error' }
    | { type: 'message:open' }
    | ServerSentMessageEvent
    | { type: 'session:fetched'; session: Session }
    | ServerSentSessionEvent,
) {
  console.groupCollapsed(action.type);
  console.log('state\n', current(state));
  console.log('action\n', action);

  if (action.type === 'message:open') {
    state.loading = true;
    state.stream = '';
  }

  if (action.type === 'message:error') {
    state.loading = false;
    delete state.stream;
  }

  if (action.type === 'message:done') {
    state.loading = false;
  }

  if (action.type === 'message:chunk') {
    assert(state.stream !== undefined);
    state.stream = state.stream + action.text;
  }

  if (action.type === 'session:fetched') {
    state.session = action.session;
  }

  if (action.type === 'session:subjectChanged') {
    assert(state.session);
    state.session.subject = action.subject;
  }

  if (action.type === 'session:topicsChanged') {
    assert(state.session);
    state.session.topics = action.topics;
  }

  if (action.type === 'session:notesChanged') {
    assert(state.session);
    state.session.notes = action.notes;
  }

  if (action.type === 'session:timerChanged') {
    assert(state.session);
    state.session.timer = action.timer;
  }

  if (action.type === 'session:messageAdded') {
    assert(state.session);
    state.session.messages.push(action.message);

    if (action.message.role === 'assistant' && action.message.content) {
      delete state.stream;
    }
  }

  if (action.type === 'session:eventEmitted') {
    assert(state.session);
    state.session.events.push(action.event);
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
            <Timer timer={session.timer} />
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

function Timer({ timer }: { timer: Timer }) {
  const now = useNow();
  const { hours = 0, minutes = 0, seconds = 0 } = getRemainingTime(timer, now);

  const togglePauseResume = useCallback(() => {
    if (!timer.pausedAt) {
      fetch('/api/timer/pause').catch(console.error);
    } else {
      fetch('/api/timer/resume').catch(console.error);
    }
  }, [timer]);

  const Icon = timer.pausedAt ? PlayIcon : PauseIcon;

  return (
    <div className="font-mono inline-flex flex-row gap-4 items-center">
      <button onClick={togglePauseResume} type="button">
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

function TopicAddedEvent({ event }: { event: GetSessionEvent<'topicAdded'> }) {
  return <div className="text-sm text-dim">Sujet ajouté : {event.topic.label}</div>;
}

function TimerStartedEvent({ event }: { event: GetSessionEvent<'timerStarted'> }) {
  return <div className="text-sm text-dim">Chronomètre démarré : {event.duration} minutes</div>;
}

function TimerPausedEvent() {
  return <div className="text-sm text-dim">Chronomètre mis en pause</div>;
}

function TimerResumedEvent() {
  return <div className="text-sm text-dim">Chronomètre redémarré</div>;
}

function MessageAddedEvent({ event }: { event: GetSessionEvent<'messageAdded'> }) {
  const { message } = event;

  if (message.role === 'tool') {
    return (
      <Details className="text-dim text-sm" summary={`Tool call result ${message.toolCallId}`}>
        <div className="mt-2 whitespace-pre-wrap font-mono text-text text-sm p-4 bg-zinc-800 rounded-md">
          {message.content}
        </div>
      </Details>
    );
  }

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
              {toolCall.arguments}
            </div>
          </Details>
        ))}
    </>
  );
}

const sessionEventMap: { [Event in SessionEvent as Event['type']]: React.ComponentType<{ event: Event }> } = {
  planInitialized: () => null,
  subjectChanged: () => null,
  topicAdded: TopicAddedEvent,
  topicRemoved: () => null,
  topicLabelChanged: () => null,
  topicStatusChanged: () => null,
  noteAdded: () => null,
  noteRemoved: () => null,
  noteContentChanged: () => null,
  timerStarted: TimerStartedEvent,
  timerPaused: TimerPausedEvent,
  timerResumed: TimerResumedEvent,
  messageAdded: MessageAddedEvent,
  discussionPathsSet: () => null,
  discussionPathSelected: () => null,
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
