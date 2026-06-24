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
    events: events.map(toSharedEvent),
  };
}

function toSharedEvent({
  aggregateType: _aggregateType,
  aggregateId: _aggregateId,
  occurredAt: _occurredAt,
  ...event
}: SessionEvent): Shared.SessionEvent {
  return event as Shared.SessionEvent;
}
