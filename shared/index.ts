type Exact<T, U extends T> = [T] extends [U] ? U : never;

function exhaustiveArray<Union>() {
  return <T extends readonly Union[]>(arr: Exact<Union, T[number]> extends never ? never : T) => arr;
}

export type TopicStatus = 'pending' | 'in_progress' | 'done';

export type Topic = {
  id: string;
  label: string;
  status: TopicStatus;
};

export type Note = {
  id: string;
  content: string;
};

export type Message =
  | {
      id: string;
      role: 'system';
      content: string;
    }
  | {
      id: string;
      role: 'user';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      content: string;
      toolCalls?: ToolCall[];
    }
  | {
      id: string;
      role: 'tool';
      toolCallId: string;
      content: string;
    };

export type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type Timer = {
  duration: number;
  startedAt: string;
  pausedAt?: string;
};

export type DiscussionPath = {
  id: string;
  label: string;
  description?: string;
};

export type Session = {
  subject: string;
  topics: Topic[];
  notes: Note[];
  timer?: Timer;
  messages: Message[];
  events: SessionEvent[];
};

export type SessionEvent =
  | { type: 'planInitialized'; date: string; subject: string; topics: Topic[] }
  | { type: 'subjectChanged'; date: string; subject: string }
  | { type: 'topicAdded'; date: string; topic: Topic }
  | { type: 'topicRemoved'; date: string; id: string }
  | { type: 'topicLabelChanged'; date: string; id: string; label: string }
  | { type: 'topicStatusChanged'; date: string; id: string; status: TopicStatus }
  | { type: 'noteAdded'; date: string; note: Note }
  | { type: 'noteRemoved'; date: string; id: string }
  | { type: 'noteContentChanged'; date: string; id: string; content: string }
  | { type: 'timerStarted'; date: string; duration: number }
  | { type: 'timerPaused'; date: string }
  | { type: 'timerResumed'; date: string }
  | { type: 'messageAdded'; date: string; message: Message }
  | { type: 'discussionPathsSet'; date: string; paths: DiscussionPath[] }
  | { type: 'discussionPathSelected'; date: string; id: string };

export type GetSessionEvent<Type extends SessionEvent['type']> = Extract<SessionEvent, { type: Type }>;

export const sessionEventTypes = exhaustiveArray<SessionEvent['type']>()([
  'planInitialized',
  'subjectChanged',
  'topicAdded',
  'topicRemoved',
  'topicLabelChanged',
  'topicStatusChanged',
  'noteAdded',
  'noteRemoved',
  'noteContentChanged',
  'timerStarted',
  'timerPaused',
  'timerResumed',
  'messageAdded',
  'discussionPathsSet',
  'discussionPathSelected',
] as const);

export type ServerSentSessionEvent =
  | { type: 'session:error'; message: string }
  | { type: 'session:subjectChanged'; subject: string }
  | { type: 'session:topicsChanged'; topics: Topic[] }
  | { type: 'session:notesChanged'; notes: Note[] }
  | { type: 'session:timerChanged'; timer?: Timer }
  | { type: 'session:messageAdded'; message: Message }
  | { type: 'session:eventEmitted'; event: SessionEvent };

export const serverSentSessionEventTypes = exhaustiveArray<ServerSentSessionEvent['type']>()([
  'session:error',
  'session:subjectChanged',
  'session:topicsChanged',
  'session:notesChanged',
  'session:timerChanged',
  'session:messageAdded',
  'session:eventEmitted',
] as const);

export type ServerSentMessageEvent =
  | { type: 'message:error'; message: string }
  | { type: 'message:done' }
  | { type: 'message:chunk'; text: string };

export const serverSentMessageEventTypes = exhaustiveArray<ServerSentMessageEvent['type']>()([
  'message:error',
  'message:done',
  'message:chunk',
] as const);
