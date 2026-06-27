import type * as assistant from './domain/assistant';
import type { Language as DomainLanguage } from './domain/i18n';
import type * as session from './domain/session';

export namespace Shared {
  export type AssistantUiEvent = assistant.AssistantUiEvent;

  export type SessionUiEvent =
    | { type: 'SessionChanged'; sessionId: string; changes: Partial<Omit<Session, 'timeline'>> }
    | { type: 'TimelineItemAdded'; sessionId: string; item: TimelineItem }
    | { type: 'TimelineItemChanged'; sessionId: string; index: number; item: TimelineItem };

  export type Language = DomainLanguage;

  export type TopicStatus = session.TopicStatus;
  export type Topic = session.Topic;
  export type Note = session.Note;
  export type Timer = { duration: number; startedAt: Date; pausedAt?: Date };
  export type Message = session.Message;
  export type Role = session.Role;
  export type ToolCall = session.ToolCall;
  export type DiscussionPath = session.DiscussionPath;
  export type Posture = session.Posture;
  export type PostureMode = session.PostureMode;

  export type SelectablePath = DiscussionPath & { selected?: boolean };

  export type TimelineItem =
    | { kind: 'message'; role: Role; content: string; toolCalls?: ToolCall[]; paths?: SelectablePath[] }
    | { kind: 'model-changed'; model: string }
    | { kind: 'subject-changed'; subject: string }
    | { kind: 'topic-added'; label: string }
    | { kind: 'topic-removed'; label: string }
    | { kind: 'topic-label-changed'; oldLabel: string; newLabel: string }
    | { kind: 'topic-status-changed'; label: string; status: TopicStatus }
    | { kind: 'note-added'; content: string }
    | { kind: 'note-removed'; content: string }
    | { kind: 'note-content-changed'; content: string }
    | { kind: 'timer-started'; duration: number }
    | { kind: 'timer-cleared' }
    | { kind: 'timer-paused' }
    | { kind: 'timer-resumed' }
    | { kind: 'posture-changed'; posture: Posture; reason: string; forced: false }
    | { kind: 'posture-changed'; posture: Posture | 'auto'; reason: string; forced: true }
    | { kind: 'web-searched'; query: string; resultCount: number };

  export type Session = {
    id: string;
    model: string;
    language: Language;
    subject: string;
    topics: Topic[];
    notes: Note[];
    timer: Timer | null;
    postureMode: PostureMode;
    posture: Posture;
    timeline: TimelineItem[];
  };
}
