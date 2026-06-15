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

export type DiscussionPath = {
  id: string;
  label: string;
  description?: string;
};

export type Session = {
  subject: string;
  topics: Topic[];
  notes: Note[];
  timerStartDate?: string;
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
  | { type: 'timerStarted'; date: string }
  | { type: 'messageAdded'; date: string; message: Message }
  | { type: 'discussionPathsSet'; date: string; paths: DiscussionPath[] }
  | { type: 'discussionPathSelected'; date: string; id: string };

export type GetSessionEvent<Type extends SessionEvent['type']> = Extract<SessionEvent, { type: Type }>;

export const sessionEventTypes = [
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
  'messageAdded',
  'discussionPathsSet',
  'discussionPathSelected',
] as const satisfies Array<SessionEvent['type']>;

export type ServerSentSessionEvent =
  | { type: 'error'; message: string }
  | { type: 'chunk'; text: string }
  | { type: 'done' }
  | { type: 'subjectChanged'; subject: string }
  | { type: 'topicsChanged'; topics: Topic[] }
  | { type: 'notesChanged'; notes: Note[] }
  | { type: 'timerStarted'; date: string }
  | { type: 'messageAdded'; message: Message }
  | { type: 'sessionEventEmitted'; event: SessionEvent };

export const serverSentSessionEventTypes = [
  'error',
  'chunk',
  'done',
  'subjectChanged',
  'topicsChanged',
  'notesChanged',
  'timerStarted',
  'messageAdded',
  'sessionEventEmitted',
] as const satisfies Array<ServerSentSessionEvent['type']>;
