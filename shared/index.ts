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
  | { id: string; date: string; role: 'system'; content: string }
  | { id: string; date: string; role: 'user'; content: string }
  | { id: string; date: string; role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { id: string; date: string; role: 'tool'; toolCallId: string; content: string };

export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
  result?: unknown;
  error?: unknown;
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
  id: string;
  subject: string;
  topics: Topic[];
  notes: Note[];
  timer?: Timer;
  messages: Message[];
  events: SessionEvent[];
};

export type DomainEvent<Type extends string = string, Payload = {}> = {
  id: string;
  entityId: string;
  date: string;
  type: Type;
} & Payload;

export type SessionEvent =
  | DomainEvent<'planInitialized', { subject: string; topics: Topic[] }>
  | DomainEvent<'subjectChanged', { subject: string }>
  | DomainEvent<'topicAdded', { topic: Topic }>
  | DomainEvent<'topicRemoved', { topicId: string }>
  | DomainEvent<'topicLabelChanged', { topicId: string; label: string }>
  | DomainEvent<'topicStatusChanged', { topicId: string; status: TopicStatus }>
  | DomainEvent<'noteAdded', { note: Note }>
  | DomainEvent<'noteRemoved', { noteId: string }>
  | DomainEvent<'noteContentChanged', { noteId: string; content: string }>
  | DomainEvent<'timerStarted', { duration: number }>
  | DomainEvent<'timerCleared'>
  | DomainEvent<'timerPaused'>
  | DomainEvent<'timerResumed'>
  | DomainEvent<'messageAdded', { message: Message }>
  | DomainEvent<'discussionPathsSet', { paths: DiscussionPath[] }>
  | DomainEvent<'discussionPathSelected', { discussionPathId: string }>;

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
  'timerCleared',
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
