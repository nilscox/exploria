import { assert } from '../../utils.ts';
import { Mindmap } from '../mindmap.ts';
import { Timer } from '../timer.ts';

import type { Shared } from '../../shared.ts';
import type { Posture, PostureMode, SessionEvent } from '../session.ts';

export function toSessionView(id: string, events: SessionEvent[]): Shared.Session {
  let ended = false;
  let model = '';
  let language: Shared.Language = 'en';
  let mindmap = new Mindmap();
  let timer: Timer | null = null;
  let postureMode: PostureMode = 'auto';
  let posture: Posture = 'socratic';

  for (const event of events) {
    mindmap = mindmap.apply(event);

    switch (event.type) {
      case 'SessionCreated':
        model = event.model;
        language = event.language;
        break;

      case 'SessionEnded':
        ended = true;
        break;

      case 'SessionReopened':
        ended = false;
        break;

      case 'ModelChanged':
        model = event.model;
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

      case 'PostureChanged':
        if (event.posture !== 'auto') {
          posture = event.posture;
        }
        if (event.forced) {
          postureMode = event.posture === 'auto' ? 'auto' : 'forced';
        }
        break;
    }
  }

  return {
    id,
    ended,
    model,
    language,
    subject: mindmap.subject,
    topics: mindmap.topics,
    notes: mindmap.notes,
    timer,
    postureMode,
    posture,
    timeline: toTimeline(events),
  };
}

const timelineEventTypes = new Set<SessionEvent['type']>([
  'MessageAdded',
  'ToolCalled',
  'SessionEnded',
  'SessionReopened',
  'ModelChanged',
  'SubjectChanged',
  'TopicAdded',
  'TopicRemoved',
  'TopicLabelChanged',
  'TopicStatusChanged',
  'TopicSummaryChanged',
  'TopicMoved',
  'NoteAdded',
  'NoteRemoved',
  'NoteTitleChanged',
  'NoteContentChanged',
  'NoteMoved',
  'TimerStarted',
  'TimerCleared',
  'TimerPaused',
  'TimerResumed',
  'QuestionsAsked',
  'AnswerSelected',
  'PostureChanged',
  'SearchPerformed',
  'SummaryGenerated',
]);

export function affectsTimeline(type: SessionEvent['type']): boolean {
  return timelineEventTypes.has(type);
}

export function toTimeline(events: SessionEvent[]): Shared.TimelineItem[] {
  const items: Shared.TimelineItem[] = [];
  const topics = new Map<string, string>();
  const notes = new Map<string, string>();

  let pendingQuestions: Shared.AnswerableQuestion[] | null = null;

  for (const event of events) {
    switch (event.type) {
      case 'MessageAdded': {
        const { message } = event;

        if (message.role === 'assistant' && message.content === '') {
          break;
        }

        const item: Shared.TimelineItem = {
          kind: 'message',
          date: message.date,
          role: message.role,
          content: message.content,
        };

        if (item.role === 'assistant' && pendingQuestions) {
          item.questions = pendingQuestions;
          pendingQuestions = null;
        }

        if (item.role === 'user') {
          const prevItem = items.findLast((item) => item.kind === 'message');

          if (prevItem?.role === 'assistant' && prevItem.questions) {
            prevItem.questions.forEach((question) => question.options.forEach((option) => (option.selected = false)));
          }
        }

        items.push(item);

        break;
      }

      case 'ToolCalled':
        items.push({
          kind: 'tool-call',
          name: event.toolCall.name,
          arguments: event.toolCall.arguments,
          actor: event.actor,
          ...(event.result !== undefined && { result: event.result }),
          ...(event.error !== undefined && { error: event.error }),
        });
        break;

      case 'SessionEnded':
        items.push({ kind: 'session-ended' });
        break;

      case 'SessionReopened':
        items.push({ kind: 'session-reopened' });
        break;

      case 'ModelChanged':
        items.push({ kind: 'model-changed', model: event.model });
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

      case 'TopicSummaryChanged': {
        const label = topics.get(event.topicId);

        assert(label !== undefined);
        items.push({ kind: 'topic-summary-changed', label });
        break;
      }

      case 'TopicMoved': {
        const label = topics.get(event.topicId);

        assert(label !== undefined);
        items.push({ kind: 'topic-moved', label });
        break;
      }

      case 'NoteAdded':
        notes.set(event.note.id, event.note.title);
        items.push({ kind: 'note-added', title: event.note.title });
        break;

      case 'NoteRemoved': {
        const title = notes.get(event.noteId);

        assert(title !== undefined);
        notes.delete(event.noteId);
        items.push({ kind: 'note-removed', title });
        break;
      }

      case 'NoteTitleChanged': {
        const oldTitle = notes.get(event.noteId);

        assert(oldTitle !== undefined);
        notes.set(event.noteId, event.title);
        items.push({ kind: 'note-title-changed', oldTitle, newTitle: event.title });
        break;
      }

      case 'NoteContentChanged': {
        const title = notes.get(event.noteId);

        assert(title !== undefined);
        items.push({ kind: 'note-content-changed', title });
        break;
      }

      case 'NoteMoved': {
        const title = notes.get(event.noteId);

        assert(title !== undefined);
        items.push({ kind: 'note-moved', title });
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

      case 'QuestionsAsked': {
        pendingQuestions = structuredClone(event.questions);
        break;
      }

      case 'AnswerSelected':
        const message = items.findLast((item) => item.kind === 'message');
        assert(message?.questions);

        const question = message.questions.find((question) => question.id === event.questionId);
        assert(question);

        for (const option of question.options) {
          option.selected = option.id === event.optionId;
        }
        break;

      case 'PostureChanged':
        if (event.forced) {
          items.push({ kind: 'posture-changed', posture: event.posture, reason: event.reason, forced: true });
        } else {
          items.push({
            kind: 'posture-changed',
            posture: event.posture as Posture,
            reason: event.reason,
            forced: false,
          });
        }
        break;

      case 'SearchPerformed':
        items.push({ kind: 'web-searched', query: event.query, resultCount: event.resultCount });
        break;

      case 'SummaryGenerated':
        items.push({ kind: 'summary', summary: event.summary });
        break;
    }
  }

  return items;
}
