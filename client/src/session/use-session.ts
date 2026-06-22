import type { Shared } from '@exploria/server/shared';
import { mutationOptions, queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { current, produce } from 'immer';
import { useEffect, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { ApiError, api } from 'src/api';
import { assert, exhaustiveArray } from 'src/utils';

const sessionUiEventTypes = exhaustiveArray<Shared.AssistantUiEvent['type'] | Shared.SessionUiEvent['type']>()([
  'Chunk',
  'SessionChanged',
  'EventEmitted',
] as const);

export function useSession(sessionId: string, onEvent: (event: Shared.SessionUiEvent) => void) {
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
        const event: Shared.SessionUiEvent = { type, ...JSON.parse(data) };

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

const reducer = produce(function (
  state: {
    session?: Shared.Session;
    stream?: string;
    loading?: boolean;
    connected?: boolean;
    prompt?: string;
  },
  action:
    | { type: 'SessionFetched'; session: Shared.Session }
    | { type: 'StreamOpened' }
    | { type: 'StreamError' }
    | { type: 'PostingMessage' }
    | { type: 'MessagePosted' }
    | Shared.SessionUiEvent
    | Shared.AssistantUiEvent,
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
    state.stream ??= '';
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
