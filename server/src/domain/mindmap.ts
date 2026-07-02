import type { Note, SessionEvent, TopicStatus } from './session.ts';

export type Topic = {
  id: string;
  parentId: string | null;
  label: string;
  status?: TopicStatus;
  summary?: string;
};

type MindmapState = {
  subject: string;
  topics: Topic[];
  notes: Note[];
};

export class Mindmap {
  readonly subject: string;
  readonly topics: Topic[];
  readonly notes: Note[];

  constructor(state: Partial<MindmapState> = {}) {
    this.subject = state.subject ?? '';
    this.topics = state.topics ?? [];
    this.notes = state.notes ?? [];
  }

  hasTopic(topicId: string): boolean {
    return this.topics.some((topic) => topic.id === topicId);
  }

  getTopic(topicId: string): Topic | undefined {
    return this.topics.find((topic) => topic.id === topicId);
  }

  children(parentId: string | null): Topic[] {
    return this.topics.filter((topic) => topic.parentId === parentId);
  }

  getNote(noteId: string): Note | undefined {
    return this.notes.find((note) => note.id === noteId);
  }

  notesOf(parentId: string | null): Note[] {
    return this.notes.filter((note) => note.parentId === parentId);
  }

  subtree(topicId: string): Topic[] {
    const topic = this.getTopic(topicId);

    if (!topic) {
      return [];
    }

    const result: Topic[] = [];

    const walk = (current: Topic) => {
      for (const child of this.children(current.id)) {
        walk(child);
      }

      result.push(current);
    };

    walk(topic);

    return result;
  }

  isDescendant(topicId: string, ancestorId: string): boolean {
    let current = this.getTopic(topicId);

    while (current?.parentId != null) {
      if (current.parentId === ancestorId) {
        return true;
      }

      current = this.getTopic(current.parentId);
    }

    return false;
  }

  apply(event: SessionEvent): Mindmap {
    type Handler<Event extends SessionEvent> = (event: Event) => Mindmap;

    const handlers: Partial<{ [Event in SessionEvent as Event['type']]: Handler<Event> }> = {
      SubjectChanged: (event) => {
        return this.withState({
          subject: event.subject,
        });
      },

      TopicAdded: (event) => {
        return this.withState({
          topics: [...this.topics, event.topic],
        });
      },

      TopicRemoved: (event) => {
        return this.withState({
          topics: this.topics.filter((topic) => topic.id !== event.topicId),
        });
      },

      TopicLabelChanged: (event) => {
        return this.withState({
          topics: this.mapTopic(event.topicId, (topic) => ({ ...topic, label: event.label })),
        });
      },

      TopicStatusChanged: (event) => {
        return this.withState({
          topics: this.mapTopic(event.topicId, (topic) => ({ ...topic, status: event.status })),
        });
      },

      TopicSummaryChanged: (event) => {
        return this.withState({
          topics: this.mapTopic(event.topicId, (topic) => ({ ...topic, summary: event.summary })),
        });
      },

      TopicMoved: (event) => {
        return this.withTopicMoved(event.topicId, event.parentId);
      },

      NoteAdded: (event) => {
        return this.withState({
          notes: [...this.notes, event.note],
        });
      },

      NoteRemoved: (event) => {
        return this.withState({
          notes: this.notes.filter((note) => note.id !== event.noteId),
        });
      },

      NoteTitleChanged: (event) => {
        return this.withState({
          notes: this.mapNote(event.noteId, (note) => ({ ...note, title: event.title })),
        });
      },

      NoteContentChanged: (event) => {
        return this.withState({
          notes: this.mapNote(event.noteId, (note) => ({ ...note, content: event.content })),
        });
      },

      NoteMoved: (event) => {
        return this.withState({
          notes: this.mapNote(event.noteId, (note) => ({ ...note, parentId: event.parentId })),
        });
      },
    };

    if (event.type in handlers) {
      return (handlers[event.type] as Handler<SessionEvent>)(event);
    }

    return this;
  }

  withTopicMoved(topicId: string, parentId: string | null): Mindmap {
    return this.withState({
      topics: this.mapTopic(topicId, (topic) => {
        const moved: Topic = { ...topic, parentId };

        if (parentId === null) {
          moved.status ??= 'pending';
        } else {
          delete moved.status;
        }

        return moved;
      }),
    });
  }

  private withState(changes: Partial<MindmapState>): Mindmap {
    return new Mindmap({ subject: this.subject, topics: this.topics, notes: this.notes, ...changes });
  }

  private mapTopic(topicId: string, fn: (topic: Topic) => Topic): Topic[] {
    return this.topics.map((topic) => (topic.id === topicId ? fn(topic) : topic));
  }

  private mapNote(noteId: string, fn: (note: Note) => Note): Note[] {
    return this.notes.map((note) => (note.id === noteId ? fn(note) : note));
  }
}
