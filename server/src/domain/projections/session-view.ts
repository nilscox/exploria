import { intervalToDuration, sub } from 'date-fns';

import { hasId } from '../../utils';

import type { Shared } from '../../shared';
import type { DiscussionPath, Note, SessionEvent, Timer, Topic } from '../session';

export function toSessionView(id: string, events: SessionEvent[]): Shared.Session {
  let model = '';
  let subject = '';
  let topics: Topic[] = [];
  let notes: Note[] = [];
  let timer: Timer | null = null;
  let discussionPaths: DiscussionPath[] = [];

  for (const event of events) {
    switch (event.type) {
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

        if (topic) {
          topic.label = event.label;
        }
        break;
      }
      case 'TopicStatusChanged': {
        const topic = topics.find(hasId(event.topicId));

        if (topic) {
          topic.status = event.status;
        }
        break;
      }
      case 'NoteAdded':
        notes.push(event.note);
        break;
      case 'NoteRemoved':
        notes = notes.filter(({ id }) => id !== event.noteId);
        break;
      case 'NoteContentChanged': {
        const note = notes.find(hasId(event.noteId));

        if (note) {
          note.content = event.content;
        }
        break;
      }
      case 'TimerStarted':
        timer = { duration: event.duration, startedAt: event.occurredAt };
        break;
      case 'TimerCleared':
        timer = null;
        break;
      case 'TimerPaused':
        if (timer) {
          timer.pausedAt = event.occurredAt;
        }
        break;
      case 'TimerResumed':
        if (timer?.pausedAt) {
          const elapsed = intervalToDuration({ start: timer.startedAt, end: timer.pausedAt });

          timer.startedAt = sub(event.occurredAt, elapsed);
          delete timer.pausedAt;
        }
        break;
      case 'DiscussionPathsSet':
        discussionPaths = event.paths;
        break;
      case 'DiscussionPathSelected':
        discussionPaths = [];
        break;
    }
  }

  return {
    id,
    model,
    subject,
    topics,
    notes,
    timer,
    discussionPaths,
    timeline: toTimeline(events),
    events: events.map(toSharedEvent),
  };
}

export function toTimeline(events: SessionEvent[]): Shared.TimelineItem[] {
  const items: Shared.TimelineItem[] = [];

  const lastMessage = () => {
    return items.findLast((item) => item.kind === 'message');
  };

  for (const event of events) {
    switch (event.type) {
      case 'MessageAdded': {
        const { message } = event;

        items.push({
          kind: 'message',
          role: message.role,
          content: message.content,
          toolCalls: message.role === 'assistant' ? message.toolCalls : undefined,
        });
        break;
      }
      case 'TopicAdded':
        items.push({ kind: 'topic-added', label: event.topic.label });
        break;
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

        if (message?.kind === 'message') {
          message.paths = event.paths.map((path) => ({ ...path, selected: false }));
        }
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

function toSharedEvent({
  aggregateType: _aggregateType,
  aggregateId: _aggregateId,
  occurredAt: _occurredAt,
  ...event
}: SessionEvent): Shared.SessionEvent {
  return event as Shared.SessionEvent;
}
