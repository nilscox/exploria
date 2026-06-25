import { AggregateRoot, type DomainEvent } from '../aggregate-root';
import { assert, hasId } from '../utils';
import { Timer } from './timer';

import type { Clock } from '../adapters/clock';
import type { Generator } from '../adapters/generator';
import type { Shared } from '../shared';

export type TopicStatus = 'pending' | 'in_progress' | 'done';

export type Topic = {
  id: string;
  label: string;
  status: TopicStatus;
};

export type Note = {
  id: string;
  content: string;
};

export type Message =
  | { date: Date; role: 'system'; content: string }
  | { date: Date; role: 'user'; content: string }
  | { date: Date; role: 'assistant'; content: string; model: string; toolCalls?: ToolCall[] };

export type Role = Message['role'];

export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type ToolCallResult = {
  id: string;
  date: Date;
  result?: unknown;
  error?: string | null;
};

export type DiscussionPath = {
  id: string;
  label: string;
  description?: string;
};

type SessionDomainEvent<Type extends string, Payload = {}> = DomainEvent<'Session', Type> & Payload;

export type SessionEvent =
  | SessionDomainEvent<'ModelChanged', { model: string }>
  | SessionDomainEvent<'PlanInitialized', { subject: string; topics: Topic[] }>
  | SessionDomainEvent<'SubjectChanged', { subject: string }>
  | SessionDomainEvent<'TopicAdded', { topic: Topic }>
  | SessionDomainEvent<'TopicRemoved', { topicId: string }>
  | SessionDomainEvent<'TopicLabelChanged', { topicId: string; label: string }>
  | SessionDomainEvent<'TopicStatusChanged', { topicId: string; status: TopicStatus }>
  | SessionDomainEvent<'NoteAdded', { note: Note }>
  | SessionDomainEvent<'NoteRemoved', { noteId: string }>
  | SessionDomainEvent<'NoteContentChanged', { noteId: string; content: string }>
  | SessionDomainEvent<'TimerStarted', { duration: number }>
  | SessionDomainEvent<'TimerCleared'>
  | SessionDomainEvent<'TimerPaused'>
  | SessionDomainEvent<'TimerResumed'>
  | SessionDomainEvent<'MessageAdded', { message: Message }>
  | SessionDomainEvent<'ToolCallResultAdded', { result: ToolCallResult }>
  | SessionDomainEvent<'DiscussionPathsSet', { paths: DiscussionPath[] }>
  | SessionDomainEvent<'DiscussionPathSelected', { pathId: string; label: string }>;

export type GetSessionEvent<Type extends SessionEvent['type']> = Extract<SessionEvent, { type: Type }>;

export type SessionUiEvent = { type: 'SessionChanged'; sessionId: string; changes: Partial<Shared.Session> };

export class Session extends AggregateRoot<SessionEvent> {
  get id(): string {
    return this._id;
  }

  private _model: string = '';

  get model(): string {
    return this._model;
  }

  private _subject: string = '';

  get subject(): string {
    return this._subject;
  }

  private _topics: Topic[] = [];

  get topics() {
    return this._topics;
  }

  private _notes: Note[] = [];

  get notes() {
    return this._notes;
  }

  private _timer: Timer | null = null;

  get timer() {
    return this._timer;
  }

  private _discussionPaths: DiscussionPath[] = [];

  get discussionPaths() {
    return this._discussionPaths;
  }

  private _events: SessionEvent[] = [];

  get events() {
    return this._events;
  }

  constructor(generator: Generator, clock: Clock) {
    super(generator, clock);
  }

  static replay(generator: Generator, clock: Clock, id: string, events: SessionEvent[]) {
    const session = new Session(generator, clock);

    session._id = id;

    for (const event of events) {
      session.apply(event);
    }

    return session;
  }

  protected apply(event: SessionEvent) {
    const handle: Partial<{ [Event in SessionEvent as Event['type']]: (event: Event) => void }> = {
      ModelChanged: ({ model }) => {
        this._model = model;
      },

      PlanInitialized: ({ subject, topics }) => {
        this._subject = subject;
        this._topics = topics;
      },

      SubjectChanged: ({ subject }) => {
        this._subject = subject;
      },

      TopicAdded: ({ topic }) => {
        this._topics.push(topic);
      },

      TopicRemoved: ({ topicId }) => {
        this._topics = this._topics.filter(({ id }) => id !== topicId);
      },

      TopicLabelChanged: ({ topicId, label }) => {
        const topic = this._topics.find(hasId(topicId));
        assert(topic);
        topic.label = label;
      },

      TopicStatusChanged: ({ topicId, status }) => {
        const topic = this._topics.find(hasId(topicId));
        assert(topic);
        topic.status = status;
      },

      NoteAdded: ({ note }) => {
        this._notes.push(note);
      },

      NoteRemoved: ({ noteId }) => {
        this._notes = this._notes.filter(({ id }) => id !== noteId);
      },

      NoteContentChanged: ({ noteId, content }) => {
        const note = this._notes.find(hasId(noteId));
        assert(note);
        note.content = content;
      },

      TimerStarted: ({ occurredAt, duration }) => {
        this._timer = Timer.start(duration, occurredAt);
      },

      TimerCleared: () => {
        this._timer = null;
      },

      TimerPaused: ({ occurredAt }) => {
        assert(this._timer);
        this._timer = this._timer.pause(occurredAt);
      },

      TimerResumed: ({ occurredAt }) => {
        assert(this._timer);
        this._timer = this._timer.resume(occurredAt);
      },

      DiscussionPathsSet: ({ paths }) => {
        this._discussionPaths = paths;
      },

      DiscussionPathSelected: () => {
        this._discussionPaths = [];
      },
    };

    if (event.type in handle) {
      (handle[event.type] as (event: SessionEvent) => void)(event);
    }

    this._events.push(event);
  }

  setModel(model: string) {
    this.emit('ModelChanged', { model });
  }

  initializePlan(subject: string, topics: Array<Omit<Topic, 'id' | 'status'>>) {
    const withIds: Topic[] = topics.map((topic) => ({ ...topic, id: this.generator.id(), status: 'pending' }));

    this.emit('PlanInitialized', { subject, topics: withIds });
  }

  setSubject(subject: string) {
    this.emit('SubjectChanged', { subject });
  }

  addTopic({ label }: Omit<Topic, 'id' | 'status'>) {
    const topic: Topic = {
      id: this.generator.id(),
      label,
      status: 'pending',
    };

    this.emit('TopicAdded', { topic });
  }

  removeTopic(topicId: string) {
    if (!this._topics.some(hasId(topicId))) {
      return;
    }

    this.emit('TopicRemoved', { topicId });
  }

  updateTopic(topicId: string, { label, status }: Partial<Omit<Topic, 'id'>>) {
    const topic = this._topics.find(hasId(topicId));

    assert(topic, new Error(`Cannot find topic "${topicId}"`));

    if (label) {
      this.emit('TopicLabelChanged', { topicId, label });
    }

    if (status) {
      this.emit('TopicStatusChanged', { topicId, status });
    }
  }

  addNote({ content }: Omit<Note, 'id'>) {
    const note: Note = {
      id: this.generator.id(),
      content,
    };

    this.emit('NoteAdded', { note });
  }

  removeNote(noteId: string) {
    if (!this._notes.some(hasId(noteId))) {
      return;
    }

    this.emit('NoteRemoved', { noteId });
  }

  updateNote(noteId: string, { content }: Partial<Omit<Note, 'id'>>) {
    const note = this._notes.find(hasId(noteId));

    assert(note, new Error(`Cannot find note "${noteId}"`));

    if (content) {
      this.emit('NoteContentChanged', { noteId, content });
    }
  }

  startTimer(duration: number) {
    assert(!this._timer, new Error('Un chronomètre est déjà lancé'));

    this.emit('TimerStarted', { duration });
  }

  clearTimer() {
    assert(this._timer, new Error("Le chronomètre n'est pas lancé"));

    this.emit('TimerCleared', {});
  }

  pauseTimer() {
    assert(this._timer);

    this.emit('TimerPaused', {});
  }

  resumeTimer() {
    assert(this._timer?.isPaused);

    this.emit('TimerResumed', {});
  }

  addMessage(role: Exclude<Role, 'assistant'>, content: string): void;
  addMessage(role: Extract<Role, 'assistant'>, content: string, params: { model: string; toolCalls: ToolCall[] }): void;

  addMessage(role: Role, content: string, params?: { model: string; toolCalls: ToolCall[] }) {
    const date = this.clock.now();
    let message: Message;

    if (role === 'assistant') {
      assert(params);

      message = { date, role, content, model: params.model };

      if (params.toolCalls.length > 0) {
        message.toolCalls = params.toolCalls;
      }
    } else {
      message = { date, role, content };
    }

    this.emit('MessageAdded', { message });
  }

  addToolCallResult(toolCallId: string, param: { error: string } | { result: unknown }) {
    this.emit('ToolCallResultAdded', {
      result: {
        id: toolCallId,
        date: this.clock.now(),
        error: 'error' in param ? param.error : null,
        result: 'result' in param ? param.result : null,
      },
    });
  }

  setDiscussionPaths(paths: Array<Omit<DiscussionPath, 'id'>>) {
    const withIds: DiscussionPath[] = paths.map((path) => ({ ...path, id: this.generator.id() }));

    this.emit('DiscussionPathsSet', { paths: withIds });
  }

  selectDiscussionPath(pathId: string) {
    const path = this._discussionPaths.find(hasId(pathId));

    assert(path, new Error(`Cannot find discussion path "${pathId}"`));

    this.emit('DiscussionPathSelected', { pathId, label: path.label });
  }
}
