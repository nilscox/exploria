import clsx from 'clsx';
import { current, produce } from 'immer';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import { Markdown } from './markdown';
import {
  isSessionEventType,
  sessionEventTypes,
  type GetSessionEvent,
  type Message,
  type Session,
  type SessionEvent,
} from './types';
import { assert } from './utils';

export function App() {
  const [state, dispatch] = useReducer(reducer, {});

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((session) => dispatch({ type: 'session', session }))
      .catch(console.error);
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [state.stream, state.session?.events]);

  const call = useCallback((message: string) => {
    const source = new EventSource(`/api/chat?message=${encodeURIComponent(message)}`);

    source.addEventListener('open', () => {
      dispatch({ type: 'open' });
    });

    source.addEventListener('chunk', (event) => {
      dispatch({ type: 'chunk', chunk: JSON.parse(event.data) });
    });

    source.addEventListener('done', () => {
      dispatch({ type: 'done' });
      source.close();
    });

    source.addEventListener('error', (event) => {
      console.log('error', event);
      source.close();
    });

    for (const type of sessionEventTypes) {
      source.addEventListener(type, (event) => {
        dispatch({ type, ...JSON.parse(event.data) });
      });
    }

    source.addEventListener('message_added', (event) => {
      const data: GetSessionEvent<'message_added'> = JSON.parse(event.data);

      if (data.message.role === 'user' && textareaRef.current) {
        textareaRef.current.value = '';
      }
    });
  }, []);

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const message = data.get('message') as string;

      call(message);
    },
    [call],
  );

  const handleKeyDown = useCallback<React.KeyboardEventHandler<HTMLTextAreaElement>>((event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.currentTarget.form?.requestSubmit();
    }
  }, []);

  const messages = useMemo(() => {
    if (!state.session?.events) {
      return [];
    }

    return state.session?.events.filter((event) => event.type === 'message_added').map((event) => event.message);
  }, [state.session?.events]);

  if (!state.session) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 col h-full py-8">
      <div className="flex-1 row gap-8 overflow-hidden">
        <div className="flex-1 overflow-y-auto col gap-4 pb-8 px-2 scrollbar-thin scrollbar-thumb-zinc-600">
          <Messages messages={messages} />
          {state.stream && <Message message={{ role: 'assistant', content: state.stream }} />}
          <div ref={bottomRef} />
        </div>
        <div className="h-full">
          <Info session={state.session} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          name="message"
          rows={6}
          readOnly={state.loading}
          onKeyDown={handleKeyDown}
          aria-label="Message"
          className="border rounded-md block w-full p-2 bg-zinc-800 read-only:text-dim"
        />
      </form>
    </div>
  );
}

const reducer = produce(function (
  state: { session?: Session; stream?: string; loading?: boolean },
  action:
    | { type: 'session'; session: Session }
    | { type: 'open' }
    | { type: 'chunk'; chunk: string }
    | { type: 'done' }
    | SessionEvent,
) {
  console.groupCollapsed(action.type);
  console.log('state\n', current(state));
  console.log('action\n', action);

  if (action.type === 'open') {
    state.loading = true;
    state.stream = '';
  }

  if (action.type === 'done') {
    state.loading = false;
  }

  if (action.type === 'session') {
    state.session = action.session;
  }

  if (action.type === 'chunk') {
    assert(state.stream !== undefined);
    state.stream = state.stream + action.chunk;
  }

  if (isSessionEventType(action.type)) {
    assert(state.session);
    state.session.events.push(action as SessionEvent);
  }

  if (action.type === 'plan_updated') {
    assert(state.session);
    state.session.plan = action.plan;
  }

  if (action.type === 'notes_updated') {
    assert(state.session);
    state.session.notes = action.notes;
  }

  if (action.type === 'message_added' && action.message.role === 'assistant') {
    delete state.stream;
  }

  console.log('state\n', current(state));
  console.groupEnd();
});

function Info({ session }: { session: Session }) {
  return (
    <div className="sticky top-0 w-64">
      <section>
        <h2 className="my-4 text-2xl">Sujets</h2>

        <ul className="col gap-2">
          {session.plan.topics.map((topic) => (
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

      <section>
        <h2 className="my-4 text-2xl">Notes</h2>

        <ul className="col gap-2">
          {session.notes.map((note) => (
            <li key={note.id} className="p-2 bg-zinc-800 rounded-md">
              <Markdown markdown={note.content} title={note.content} className="line-clamp-2" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Messages({ messages }: { messages: Message[] }) {
  return messages.map((message, index) => <Message key={index} message={message} />);
}

function Message({ message }: { message: Message }) {
  return (
    <Markdown
      markdown={message.content}
      className={clsx(message.role === 'user' && 'bg-zinc-800 px-4 py-2 rounded-md')}
    />
  );
}
