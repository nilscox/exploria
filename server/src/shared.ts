import type * as assistant from './domain/assistant.ts';
import type { Language as DomainLanguage } from './domain/i18n/index.ts';
import type * as mindmap from './domain/mindmap.ts';
import type * as session from './domain/session.ts';
import type * as summary from './domain/summary.ts';

export namespace Shared {
  export type User = { id: string; email: string; name: string | null };

  export type Summary = summary.Summary;

  export type AssistantUiEvent = assistant.AssistantUiEvent;

  export type SessionUiEvent =
    | { type: 'SessionChanged'; sessionId: string; changes: Partial<Omit<Session, 'timeline'>> }
    | { type: 'TimelineItemAdded'; sessionId: string; item: TimelineItem }
    | { type: 'TimelineItemChanged'; sessionId: string; index: number; item: TimelineItem };

  export type Language = DomainLanguage;

  export type TopicStatus = session.TopicStatus;
  export type Topic = session.Topic;
  export type Note = session.Note;
  export type MindmapNode = mindmap.MindmapNode;
  export type Mindmap = { nodes: MindmapNode[] };
  export type Timer = { duration: number; startedAt: Date; pausedAt?: Date };
  export type Message = session.Message;
  export type Role = session.Role;
  export type ToolCall = session.ToolCall;
  export type DiscussionPath = session.DiscussionPath;
  export type Posture = session.Posture;
  export type PostureMode = session.PostureMode;

  export type SelectablePath = DiscussionPath & { selected?: boolean };

  export type TimelineItem =
    | { kind: 'message'; role: Role; date: string; content: string; toolCalls?: ToolCall[]; paths?: SelectablePath[] }
    | { kind: 'model-changed'; model: string }
    | { kind: 'session-ended' }
    | { kind: 'session-reopened' }
    | { kind: 'subject-changed'; subject: string }
    | { kind: 'node-added'; label: string }
    | { kind: 'node-removed'; label: string }
    | { kind: 'node-label-changed'; oldLabel: string; newLabel: string }
    | { kind: 'node-status-changed'; label: string; status: TopicStatus }
    | { kind: 'node-summary-changed'; label: string }
    | { kind: 'node-moved'; label: string }
    | { kind: 'note-added'; title: string }
    | { kind: 'note-removed'; title: string }
    | { kind: 'note-title-changed'; oldTitle: string; newTitle: string }
    | { kind: 'note-content-changed'; title: string }
    | { kind: 'note-moved'; title: string }
    | { kind: 'timer-started'; duration: number }
    | { kind: 'timer-cleared' }
    | { kind: 'timer-paused' }
    | { kind: 'timer-resumed' }
    | { kind: 'posture-changed'; posture: Posture; reason: string; forced: false }
    | { kind: 'posture-changed'; posture: Posture | 'auto'; reason: string; forced: true }
    | { kind: 'web-searched'; query: string; resultCount: number }
    | { kind: 'summary'; summary: Summary };

  export type Session = {
    id: string;
    ended: boolean;
    model: string;
    language: Language;
    subject: string;
    topics: Topic[];
    notes: Note[];
    mindmap: Mindmap;
    timer: Timer | null;
    postureMode: PostureMode;
    posture: Posture;
    timeline: TimelineItem[];
  };
}
