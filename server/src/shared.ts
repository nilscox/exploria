import type * as assistant from './domain/assistant';
import type * as session from './domain/session';

export namespace Shared {
  export type AssistantUiEvent = assistant.AssistantUiEvent;

  export type TopicStatus = session.TopicStatus;
  export type Topic = session.Topic;
  export type Note = session.Note;
  export type Timer = session.Timer;
  export type Message = session.Message;
  export type Role = session.Role;
  export type ToolCall = session.ToolCall;
  export type DiscussionPath = session.DiscussionPath;
  export type SessionUiEvent = session.SessionUiEvent;

  export type SelectablePath = DiscussionPath & { selected: boolean };

  export type TimelineItem =
    | { kind: 'message'; role: Role; content: string; toolCalls?: ToolCall[]; paths?: SelectablePath[] }
    | { kind: 'topic-added'; label: string }
    | { kind: 'timer-started'; duration: number }
    | { kind: 'timer-cleared' }
    | { kind: 'timer-paused' }
    | { kind: 'timer-resumed' };

  export type Session = {
    id: string;
    model: string;
    subject: string;
    topics: Topic[];
    notes: Note[];
    timer: Timer | null;
    timeline: TimelineItem[];
  };
}
