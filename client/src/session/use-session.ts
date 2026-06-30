import type { Shared } from '@exploria/server/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { current, produce } from 'immer';
import { useEffect, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { api, ApiError, options } from 'src/api';
import { assert, exhaustiveArray } from 'src/utils';

const sessionUiEventTypes = exhaustiveArray<Shared.AssistantUiEvent['type'] | Shared.SessionUiEvent['type']>()([
  'Chunk',
  'SessionChanged',
  'TimelineItemAdded',
  'TimelineItemChanged',
] as const);

export function useSession(sessionId: string) {
  const location = useLocation();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(reducer, initialState);

  const sessionQuery = useQuery(options.sessions.get(sessionId));

  const { mutate: postMessage } = useMutation({
    ...options.sessions.postMessage(sessionId),
    onMutate: () => dispatch({ type: 'PostingMessage' }),
    onSettled: () => dispatch({ type: 'MessagePosted' }),
  });

  const { mutate: selectPath } = useMutation({
    ...options.sessions.selectDiscussionPath(sessionId),
    onMutate: () => dispatch({ type: 'PostingMessage' }),
    onSettled: () => dispatch({ type: 'MessagePosted' }),
  });

  useEffect(() => {
    if (ApiError.is(sessionQuery.error) && sessionQuery.error.status === 404) {
      void navigate('/', { replace: true });
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
      });
    }

    return () => {
      source.close();
    };
  }, [hasSession, sessionId]);

  useEffect(() => {
    if (typeof location.state?.message === 'string' && state.connected) {
      postMessage(location.state.message);
      void navigate({}, { state: {}, replace: true });
    }
  }, [state.connected, location.state, postMessage, navigate]);

  return [state, postMessage, selectPath] as const;
}

type State = {
  session?: Shared.Session;
  stream: string;
  loading: boolean;
  connected: boolean;
};

const initialState: State = {
  stream: '',
  loading: false,
  connected: false,
};

type Action =
  | { type: 'SessionFetched'; session: Shared.Session }
  | { type: 'StreamOpened' }
  | { type: 'StreamError' }
  | { type: 'PostingMessage' }
  | { type: 'MessagePosted' }
  | Shared.SessionUiEvent
  | Shared.AssistantUiEvent;

const reducer = produce(function (state: State, action: Action) {
  console.groupCollapsed(action.type);
  console.log('state\n', current(state));
  console.log('action\n', action);

  if (action.type === 'SessionFetched') {
    state.session = action.session;
  }

  if (action.type === 'StreamOpened') {
    state.connected = true;
  }

  if (action.type === 'PostingMessage') {
    state.loading = true;
  }

  if (action.type === 'MessagePosted') {
    state.loading = false;
  }

  if (action.type === 'Chunk') {
    state.stream = state.stream + action.text;
  }

  if (action.type === 'SessionChanged') {
    assert(state.session);
    Object.assign(state.session, action.changes);
  }

  if (action.type === 'TimelineItemAdded') {
    assert(state.session);
    state.session.timeline.push(action.item);

    if (action.item.kind === 'message') {
      state.stream = '';
    }
  }

  if (action.type === 'TimelineItemChanged') {
    assert(state.session?.timeline[action.index]);
    state.session.timeline[action.index] = action.item;
  }

  console.log('state\n', current(state));
  console.groupEnd();
});
