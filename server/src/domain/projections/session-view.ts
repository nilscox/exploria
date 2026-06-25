import { assert, hasId } from '../../utils';
import { Timer } from '../timer';

import type { Shared } from '../../shared';
import type { Note, SessionEvent, Topic } from '../session';

export function toSessionView(id: string, events: SessionEvent[]): Shared.Session {
  let model = '';
  let language: Shared.Language = 'en';
  let subject = '';
  let topics: Topic[] = [];
  let notes: Note[] = [];
  let timer: Timer | null = null;

  for (const event of events) {
    switch (event.type) {
      case 'SessionCreated':
        model = event.model;
        language = event.language;
        break;

      case 'ModelChanged':
        model = event.model;
        break;

      case 'PlanInitialized':
        subject = event.subject;
        topics = [...event.topics];
        break;

      case 'SubjectChanged':
        subject = event.subject;
        break;

      case 'TopicAdded':
        topics.push(event.topic);
        break;

      case 'TopicRemoved':
        topics = topics.filter(({ id }) => id !== event.topicId);
        break;

      case 'TopicLabelChanged': {
        const topic = topics.find(hasId(event.topicId));

        assert(topic);
        topic.label = event.label;

        break;
      }

      case 'TopicStatusChanged': {
        const topic = topics.find(hasId(event.topicId));

        assert(topic);
        topic.status = event.status;

        break;
      }

      case 'NoteAdded':
        notes.push(event.note);
        break;

      case 'NoteRemoved':
        notes = notes.filter(({ id }) => id !== event.noteId);
        break;

      case 'NoteContentChanged':
        const note = notes.find(hasId(event.noteId));

        assert(note);
        note.content = event.content;

        break;

      case 'TimerStarted':
        timer = Timer.start(event.duration, event.occurredAt);
        break;

      case 'TimerCleared':
        timer = null;
        break;

      case 'TimerPaused':
        assert(timer);
        timer = timer.pause(event.occurredAt);
        break;

      case 'TimerResumed':
        assert(timer);
        timer = timer.resume(event.occurredAt);
        break;
    }
  }

  return {
    id,
    model,
    language,
    subject,
    topics,
    notes,
    timer,
    timeline: toTimeline(events),
  };
}

const timelineEventTypes = new Set<SessionEvent['type']>([
  'MessageAdded',
  'PlanInitialized',
  'SubjectChanged',
  'TopicAdded',
  'TopicRemoved',
  'TopicLabelChanged',
  'TopicStatusChanged',
  'NoteAdded',
  'NoteRemoved',
  'NoteContentChanged',
  'TimerStarted',
  'TimerCleared',
  'TimerPaused',
  'TimerResumed',
  'DiscussionPathsSet',
  'DiscussionPathSelected',
]);

export function affectsTimeline(type: SessionEvent['type']): boolean {
  return timelineEventTypes.has(type);
}

export function toTimeline(events: SessionEvent[]): Shared.TimelineItem[] {
  const items: Shared.TimelineItem[] = [];
  const topics = new Map<string, string>();
  const notes = new Map<string, string>();

  const lastMessage = () => {
    return items.findLast((item) => item.kind === 'message');
  };

  for (const event of events) {
    switch (event.type) {
      case 'MessageAdded': {
        const { message } = event;

        if (message.role === 'assistant' && message.content === '') {
          break;
        }

        items.push({
          kind: 'message',
          role: message.role,
          content: message.content,
          toolCalls: message.role === 'assistant' ? message.toolCalls : undefined,
        });

        break;
      }

      case 'PlanInitialized':
        for (const topic of event.topics) {
          topics.set(topic.id, topic.label);
        }

        items.push({ kind: 'plan-initialized', subject: event.subject, topicCount: event.topics.length });
        break;

      case 'SubjectChanged':
        items.push({ kind: 'subject-changed', subject: event.subject });
        break;

      case 'TopicAdded':
        topics.set(event.topic.id, event.topic.label);
        items.push({ kind: 'topic-added', label: event.topic.label });
        break;

      case 'TopicRemoved': {
        const label = topics.get(event.topicId);

        assert(label !== undefined);
        topics.delete(event.topicId);
        items.push({ kind: 'topic-removed', label });
        break;
      }

      case 'TopicLabelChanged': {
        const oldLabel = topics.get(event.topicId);

        assert(oldLabel !== undefined);
        topics.set(event.topicId, event.label);
        items.push({ kind: 'topic-label-changed', oldLabel, newLabel: event.label });
        break;
      }

      case 'TopicStatusChanged': {
        const label = topics.get(event.topicId);

        assert(label !== undefined);
        items.push({ kind: 'topic-status-changed', label, status: event.status });
        break;
      }

      case 'NoteAdded':
        notes.set(event.note.id, event.note.content);
        items.push({ kind: 'note-added', content: event.note.content });
        break;

      case 'NoteRemoved': {
        const content = notes.get(event.noteId);

        assert(content !== undefined);
        notes.delete(event.noteId);
        items.push({ kind: 'note-removed', content });
        break;
      }

      case 'NoteContentChanged': {
        assert(notes.has(event.noteId));
        notes.set(event.noteId, event.content);
        items.push({ kind: 'note-content-changed', content: event.content });
        break;
      }

      case 'TimerStarted':
        items.push({ kind: 'timer-started', duration: event.duration });
        break;

      case 'TimerCleared':
        items.push({ kind: 'timer-cleared' });
        break;

      case 'TimerPaused':
        items.push({ kind: 'timer-paused' });
        break;

      case 'TimerResumed':
        items.push({ kind: 'timer-resumed' });
        break;

      case 'DiscussionPathsSet': {
        const message = lastMessage();

        assert(message?.kind === 'message');
        message.paths = event.paths.map((path) => ({ ...path, selected: false }));

        break;
      }

      case 'DiscussionPathSelected':
        for (const item of items) {
          if (item.kind === 'message' && item.paths?.some(hasId(event.pathId))) {
            for (const path of item.paths) {
              path.selected = path.id === event.pathId;
            }
          }
        }

        break;
    }
  }

  return items;
}
