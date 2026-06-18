import type * as assistant from './assistant';
import type * as session from './domain/session';
import type { DistributiveOmit } from './utils';

export namespace Shared {
  export type AssistantUiEvent = assistant.AssistantUiEvent;

  export type TopicStatus = session.TopicStatus;
  export type Topic = session.Topic;
  export type Note = session.Note;
  export type Timer = session.Timer;
  export type Message = session.Message;
  export type Role = session.Role;
  export type ToolCall = session.ToolCall;
  export type SessionEvent = DistributiveOmit<session.SessionEvent, 'aggregateType' | 'aggregateId' | 'occurredAt'>;
  export type SessionUiEvent = session.SessionUiEvent;

  export type Session = {
    id: string;
    model: string;
    subject: string;
    topics: Topic[];
    notes: Note[];
    timer: Timer | null;
    events: SessionEvent[];
  };
}
