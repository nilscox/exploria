import { intervalToDuration, sub } from 'date-fns';

import { AggregateRoot, type DomainEvent } from '../aggregate-root';
import { assert, hasId } from '../utils';

import type { Clock } from '../adapters/clock';
import type { Generator } from '../adapters/generator';
import type { UiEvent, UiNotifier } from './ui-notifier';

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
  | { id: string; date: string; role: 'system'; content: string }
  | { id: string; date: string; role: 'user'; content: string }
  | { id: string; date: string; role: 'assistant'; content: string; model: string; toolCalls?: ToolCall[] }
  | { id: string; date: string; role: 'tool'; toolCallId: string; content: string };

export type Role = Message['role'];

export type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
  result?: unknown;
  error?: unknown;
};

export type Timer = {
  duration: number;
  startedAt: string;
  pausedAt?: string;
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
  | SessionDomainEvent<'DiscussionPathsSet', { paths: DiscussionPath[] }>
  | SessionDomainEvent<'DiscussionPathSelected', { discussionPathId: string }>;

export type SessionUiEvent =
  | UiEvent<'ModelChanged', { sessionId: string; model: string }>
  | UiEvent<'SubjectChanged', { sessionId: string; subject: string }>
  | UiEvent<'TopicsChanged', { sessionId: string; topics: Topic[] }>
  | UiEvent<'NotesChanged', { sessionId: string; notes: Note[] }>
  | UiEvent<'TimerChanged', { sessionId: string; timer: Timer | null }>
  | UiEvent<'EventEmitted', { sessionId: string; event: SessionEvent }>;

export class Session extends AggregateRoot<SessionEvent> {
  private readonly uiNotifier: UiNotifier<SessionUiEvent>;

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

  private _messages: Message[] = [];

  get messages() {
    return this._messages;
  }

  private _discussionPaths: DiscussionPath[] = [];

  get discussionPaths() {
    return this._discussionPaths;
  }

  constructor(generator: Generator, clock: Clock, uiNotifier: UiNotifier) {
    super(generator, clock);
    this.uiNotifier = uiNotifier;
  }

  static from(
    generator: Generator,
    clock: Clock,
    uiNotifier: UiNotifier,
    data: {
      id: string;
      model: string;
      subject: string;
      topics: Topic[];
      notes: Note[];
      timer: Timer | null;
      messages: Message[];
      discussionPaths: DiscussionPath[];
    },
  ) {
    const session = new Session(generator, clock, uiNotifier);

    session._id = data.id;
    session._model = data.model;
    session._subject = data.subject;
    session._topics = data.topics;
    session._notes = data.notes;
    session._timer = data.timer;
    session._messages = data.messages;
    session._discussionPaths = data.discussionPaths;

    return session;
  }

  setModel(model: string) {
    this._model = model;
    this.emit('ModelChanged', { model: this.model });
    this.emitUiEvent('ModelChanged', { model: this.model });
  }

  initializePlan(subject: string, topics: Array<Omit<Topic, 'id' | 'status'>>) {
    this._subject = subject;
    this._topics = topics.map((topic) => ({ ...topic, id: this.generator.id(), status: 'pending' }));

    this.emit('PlanInitialized', { subject: this.subject, topics: this.topics });
    this.emitUiEvent('SubjectChanged', { subject: this.subject });
    this.emitUiEvent('TopicsChanged', { topics: this.topics });
  }

  setSubject(subject: string) {
    this._subject = subject;

    this.emit('SubjectChanged', { subject });
    this.emitUiEvent('SubjectChanged', { subject: this.subject });
  }

  addTopic({ label }: Omit<Topic, 'id' | 'status'>) {
    const topic: Topic = {
      id: this.generator.id(),
      label,
      status: 'pending',
    };

    this._topics.push(topic);

    this.emit('TopicAdded', { topic });
    this.emitUiEvent('TopicsChanged', { topics: this.topics });
  }

  removeTopic(topicId: string) {
    const index = this._topics.findIndex(hasId(topicId));

    if (index >= 0) {
      this._topics.splice(index, 1);

      this.emit('TopicRemoved', { topicId });
      this.emitUiEvent('TopicsChanged', { topics: this.topics });
    }
  }

  updateTopic(topicId: string, { label, status }: Partial<Omit<Topic, 'id'>>) {
    const topic = this._topics.find(hasId(topicId));

    assert(topic, new Error(`Cannot find topic "${topicId}"`));

    if (label) {
      topic.label = label;
      this.emit('TopicLabelChanged', { topicId, label });
    }

    if (status) {
      topic.status = status;
      this.emit('TopicStatusChanged', { topicId, status });
    }

    if (label || status) {
      this.emitUiEvent('TopicsChanged', { topics: this.topics });
    }
  }

  addNote({ content }: Omit<Note, 'id'>) {
    const note = {
      id: this.generator.id(),
      content,
    };

    this._notes.push(note);

    this.emit('NoteAdded', { note });
    this.emitUiEvent('NotesChanged', { notes: this.notes });
  }

  removeNote(noteId: string) {
    const index = this._notes.findIndex(hasId(noteId));

    if (index >= 0) {
      this._notes.splice(index, 1);

      this.emit('NoteRemoved', { noteId });
      this.emitUiEvent('NotesChanged', { notes: this.notes });
    }
  }

  updateNote(noteId: string, { content }: Partial<Omit<Note, 'id'>>) {
    const note = this._notes.find(hasId(noteId));

    assert(note, new Error(`Cannot find note "${noteId}"`));

    if (content) {
      note.content = content;

      this.emit('NoteContentChanged', { noteId, content });
      this.emitUiEvent('NotesChanged', { notes: this.notes });
    }
  }

  startTimer(duration: number) {
    const now = this.clock.now();

    assert(!this._timer, new Error('Un chronomètre est déjà lancé'));

    this._timer = { duration, startedAt: now.toISOString() };

    this.emit('TimerStarted', { duration });
    this.emitUiEvent('TimerChanged', { timer: this.timer });
  }

  clearTimer() {
    assert(this._timer, new Error("Le chronomètre n'est pas lancé"));

    this._timer = null;

    this.emit('TimerCleared', {});
    this.emitUiEvent('TimerChanged', { timer: this.timer });
  }

  pauseTimer() {
    assert(this._timer);

    this._timer.pausedAt = this.clock.now().toISOString();

    this.emit('TimerPaused', {});
    this.emitUiEvent('TimerChanged', { timer: this.timer });
  }

  resumeTimer() {
    assert(this._timer);
    assert(this._timer.pausedAt);

    const elapsed = intervalToDuration({
      start: this._timer.startedAt,
      end: this._timer.pausedAt,
    });

    this._timer.startedAt = sub(this.clock.now(), elapsed).toISOString();
    delete this._timer.pausedAt;

    this.emit('TimerResumed', {});
    this.emitUiEvent('TimerChanged', { timer: this.timer });
  }

  addMessage(
    role: Exclude<Role, 'tool'>,
    content: string,
    { model, toolCalls }: { model?: string; toolCalls?: ToolCall[] } = {},
  ) {
    const id = this.generator.id();
    const date = this.clock.now().toISOString();
    let message: Message;

    if (role === 'assistant') {
      assert(model);

      message = { id, date, role, model, content };

      if (toolCalls && toolCalls.length > 0) {
        message.toolCalls = toolCalls;
      }
    } else {
      message = { id, date, role, content };
    }

    this._messages.push(message);

    this.emit('MessageAdded', { message });
  }

  addToolCallResult(toolCallId: string, result: string) {
    const message: Message = {
      id: this.generator.id(),
      date: this.clock.now().toISOString(),
      role: 'tool',
      toolCallId,
      content: result,
    };

    this._messages.push(message);

    this.emit('MessageAdded', { message });
  }

  setDiscussionPath(paths: DiscussionPath[]) {
    this._discussionPaths = paths;

    this.emit('DiscussionPathsSet', { paths });
  }

  selectDiscussionPath(discussionPathId: string) {
    const path = this.discussionPaths.find(hasId(discussionPathId));

    assert(path, new Error(`Cannot find discussion path "${discussionPathId}"`));

    this.emit('DiscussionPathSelected', { discussionPathId });
  }

  protected override emit<Type extends SessionEvent['type']>(
    type: Type,
    payload: Omit<Extract<SessionEvent, { type: Type }>, 'occurredAt' | 'aggregateType' | 'aggregateId' | 'type'>,
  ) {
    const event = super.emit(type, payload);

    this.emitUiEvent('EventEmitted', { event });

    return event;
  }

  private emitUiEvent<Type extends SessionUiEvent['type']>(
    type: Type,
    event: Omit<Extract<SessionUiEvent, { type: Type }>, 'sessionId' | 'type'>,
  ) {
    this.uiNotifier.notify(this._id, { sessionId: this._id, type, ...event } as Extract<
      SessionUiEvent,
      { type: Type }
    >);
  }
}
