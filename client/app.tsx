import clsx from 'clsx';
import { produce } from 'immer';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { Details } from './details';
import { Markdown } from './markdown';
import { assert } from './utils';

import type { Message, Plan, Session, SessionEvent } from './types';

export function App() {
  const [state, dispatch] = useReducer(reducer, { message: '' });

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((session) => dispatch({ type: 'session', session }))
      .catch(console.error);
  }, []);

  const call = useCallback((message: string) => {
    const source = new EventSource(`/api/chat?message=${encodeURIComponent(message)}`);

    for (const type of ['message_added', 'plan_updated', 'topic_updated'] satisfies Array<SessionEvent['type']>) {
      source.addEventListener(type, (event) => {
        dispatch({ type, ...JSON.parse(event.data) });
      });
    }

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
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback<React.SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();

      const data = new FormData(event.target);
      const message = data.get('message') as string;

      call(message);
      textareaRef.current!.value = '';
    },
    [call],
  );

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [state.message]);

  if (!state.session) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 col h-full py-8">
      <div className="flex-1 row gap-8 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto col gap-4 pb-8 px-2 scrollbar-thin scrollbar-thumb-zinc-600"
        >
          <Messages messages={state.session.messages} />
          {state.message && <Message message={{ role: 'assistant', content: state.message }} />}
        </div>
        <div className="h-full">
          <Plan plan={state.session.plan} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          name="message"
          rows={6}
          aria-label="Message"
          className="border rounded-md block w-full p-2 bg-zinc-800"
          onKeyDown={(event) => {
            if (event.ctrlKey && event.key === 'Enter') {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </form>
    </div>
  );
}

const reducer = produce(function (
  state: { session?: Session; message: string },
  action:
    | { type: 'session'; session: Session }
    | { type: 'open' }
    | { type: 'chunk'; chunk: string }
    | { type: 'done' }
    | SessionEvent,
) {
  if (action.type === 'session') {
    state.session = action.session;
  }

  if (action.type === 'chunk') {
    assert(state.message !== undefined);
    state.message = state.message + action.chunk;
  }

  if (action.type === 'message_added') {
    assert(state.session);
    state.session.messages.push(action.message);

    if (action.message.role === 'assistant' && !action.message.tool_calls) {
      state.message = '';
    }
  }

  if (action.type === 'plan_updated') {
    assert(state.session);
    state.session.plan = action.plan;
  }

  if (action.type === 'topic_updated') {
    assert(state.session);

    const topic = state.session.plan.topics.find((topic) => topic.id === action.id);

    assert(topic);

    if (action.label) topic.label = action.label;
    if (action.status) topic.status = action.status;
  }
});

function Plan({ plan }: { plan: Plan }) {
  return (
    <div className="sticky top-0 w-64">
      <section>
        <h2 className="my-4 text-2xl">Sujets</h2>

        <ul className="col gap-2">
          {plan.topics.map((topic) => (
            <li key={topic.id}>
              <div className={clsx('row gap-2 items-start', { 'text-dim': topic.status !== 'active' })}>
                <div className="border rounded-sm size-4 shrink-0 mt-1">
                  {topic.status === 'active' && <ArrowRightIcon className="size-full" />}
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
      </section>
    </div>
  );
}

function Messages({ messages }: { messages: Message[] }) {
  return messages.map((message, index) => <Message key={index} message={message} />);
}

function Message({ message }: { message: Message }) {
  const { role, content } = message;

  if (role === 'system') {
    return (
      <Details summary={role}>
        <div className="p-4 my-4 font-mono whitespace-pre-wrap bg-zinc-950 border rounded-md text-sm">
          {content as string}
        </div>
      </Details>
    );
  }

  if (role === 'tool') {
    return (
      <Details summary="Tool call result">
        <Markdown markdown={content as string} className="p-4 my-4 bg-zinc-950 border rounded-md text-sm" />
      </Details>
    );
  }

  if (role === 'assistant') {
    if (message.tool_calls) {
      return message.tool_calls
        .filter((call) => call.type === 'function')
        .map((call) => (
          <Details summary={`Tool call: ${call.function.name}`} key={call.id}>
            <div className="whitespace-pre-wrap p-4 my-4 bg-zinc-950 border rounded-md text-sm font-mono">
              ID: {call.id}
              {'\n'}
              Name: {call.function.name}
              {'\n'}
              Arguments: {JSON.stringify(JSON.parse(call.function.arguments), null, 2)}
            </div>
          </Details>
        ));
    }

    return <Markdown markdown={content as string} />;
  }

  if (role === 'user') {
    return <Markdown markdown={content as string} className="bg-zinc-800 px-4 py-2 rounded-md" />;
  }

  return null;
}
