import { assert, hasId } from '../../utils.ts';
import { Timer } from '../timer.ts';

import type { Shared } from '../../shared.ts';
import type { MindmapNode } from '../mindmap.ts';
import type { Note, Posture, PostureMode, SessionEvent, Topic } from '../session.ts';

export function toSessionView(id: string, events: SessionEvent[]): Shared.Session {
  let ended = false;
  let model = '';
  let language: Shared.Language = 'en';
  let subject = '';
  let nodes: MindmapNode[] = [];
  let notes: Note[] = [];
  let timer: Timer | null = null;
  let postureMode: PostureMode = 'auto';
  let posture: Posture = 'socratic';

  for (const event of events) {
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

      case 'SubjectChanged':
        subject = event.subject;
        break;

      case 'MindmapNodeAdded':
        nodes.push(structuredClone(event.node));
        break;

      case 'MindmapNodeRemoved':
        nodes = nodes.filter(({ id }) => id !== event.nodeId);
        break;

      case 'MindmapNodeLabelChanged': {
        const node = nodes.find(hasId(event.nodeId));

        assert(node);
        node.label = event.label;

        break;
      }

      case 'MindmapNodeStatusChanged': {
        const node = nodes.find(hasId(event.nodeId));

        assert(node);
        node.status = event.status;

        break;
      }

      case 'MindmapNodeMoved': {
        const node = nodes.find(hasId(event.nodeId));

        assert(node);
        node.parentId = event.parentId;

        if (event.parentId === null) {
          node.status ??= 'pending';
        } else {
          delete node.status;
        }

        break;
      }

      case 'NoteAdded':
        notes.push(structuredClone(event.note));
        break;

      case 'NoteRemoved':
        notes = notes.filter(({ id }) => id !== event.noteId);
        break;

      case 'NoteContentChanged': {
        const note = notes.find(hasId(event.noteId));

        assert(note);
        note.content = event.content;

        break;
      }

      case 'NoteMoved': {
        const note = notes.find(hasId(event.noteId));

        assert(note);
        note.parentId = event.parentId;

        break;
      }

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
    subject,
    topics: toTopics(nodes),
    notes,
    mindmap: { nodes },
    timer,
    postureMode,
    posture,
    timeline: toTimeline(events),
  };
}

function toTopics(nodes: MindmapNode[]): Topic[] {
  return nodes
    .filter((node) => node.parentId === null)
    .map((node) => ({ id: node.id, label: node.label, status: node.status ?? 'pending' }));
}

const timelineEventTypes = new Set<SessionEvent['type']>([
  'MessageAdded',
  'SessionEnded',
  'SessionReopened',
  'ModelChanged',
  'SubjectChanged',
  'MindmapNodeAdded',
  'MindmapNodeRemoved',
  'MindmapNodeLabelChanged',
  'MindmapNodeStatusChanged',
  'MindmapNodeMoved',
  'NoteAdded',
  'NoteRemoved',
  'NoteContentChanged',
  'NoteMoved',
  'TimerStarted',
  'TimerCleared',
  'TimerPaused',
  'TimerResumed',
  'DiscussionPathsSet',
  'DiscussionPathSelected',
  'PostureChanged',
  'SearchPerformed',
  'SummaryGenerated',
]);

export function affectsTimeline(type: SessionEvent['type']): boolean {
  return timelineEventTypes.has(type);
}

export function toTimeline(events: SessionEvent[]): Shared.TimelineItem[] {
  const items: Shared.TimelineItem[] = [];
  const nodes = new Map<string, string>();
  const notes = new Map<string, string>();

  let pendingPaths: Shared.SelectablePath[] | null = null;

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
          toolCalls: message.role === 'assistant' ? message.toolCalls : undefined,
        };

        if (item.role === 'assistant' && pendingPaths) {
          item.paths = pendingPaths;
          pendingPaths = null;
        }

        if (item.role === 'user') {
          const prevItem = items.findLast((item) => item.kind === 'message');

          if (prevItem?.role === 'assistant' && prevItem.paths) {
            prevItem.paths.forEach((path) => (path.selected = false));
          }
        }

        items.push(item);

        break;
      }

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

      case 'MindmapNodeAdded':
        nodes.set(event.node.id, event.node.label);
        items.push({ kind: 'node-added', label: event.node.label });
        break;

      case 'MindmapNodeRemoved': {
        const label = nodes.get(event.nodeId);

        assert(label !== undefined);
        nodes.delete(event.nodeId);
        items.push({ kind: 'node-removed', label });
        break;
      }

      case 'MindmapNodeLabelChanged': {
        const oldLabel = nodes.get(event.nodeId);

        assert(oldLabel !== undefined);
        nodes.set(event.nodeId, event.label);
        items.push({ kind: 'node-label-changed', oldLabel, newLabel: event.label });
        break;
      }

      case 'MindmapNodeStatusChanged': {
        const label = nodes.get(event.nodeId);

        assert(label !== undefined);
        items.push({ kind: 'node-status-changed', label, status: event.status });
        break;
      }

      case 'MindmapNodeMoved': {
        const label = nodes.get(event.nodeId);

        assert(label !== undefined);
        items.push({ kind: 'node-moved', label });
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

      case 'NoteMoved': {
        const content = notes.get(event.noteId);

        assert(content !== undefined);
        items.push({ kind: 'note-moved', content });
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
        pendingPaths = structuredClone(event.paths);
        break;
      }

      case 'DiscussionPathSelected':
        const message = items.findLast((item) => item.kind === 'message');
        assert(message?.paths);

        for (const path of message.paths) {
          path.selected = path.id === event.pathId;
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
