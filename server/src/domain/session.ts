import { AggregateRoot, type DomainEvent } from '../aggregate-root.ts';
import { assert, hasId } from '../utils.ts';
import { Mindmap, type Topic } from './mindmap.ts';
import { Timer } from './timer.ts';

import type { Clock } from '../adapters/clock.ts';
import type { Generator } from '../adapters/generator.ts';
import type { Language } from './i18n/index.ts';
import type { Summary } from './summary.ts';

export type TopicStatus = 'pending' | 'in_progress' | 'done';

export const postures = ['socratic', 'devils_advocate', 'examiner', 'advisor', 'mirror'] as const;

export type Posture = (typeof postures)[number];

export type PostureMode = 'auto' | 'forced';

export type Note = {
  id: string;
  parentId: string | null;
  title: string;
  content: string;
};

export type Message =
  | { date: string; role: 'user'; content: string }
  | { date: string; role: 'assistant'; content: string; model: string; toolCalls?: ToolCall[] };

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

export type Question = {
  id: string;
  content: string;
  options: Option[];
};

export type Option = {
  id: string;
  label: string;
  description?: string;
};

type SessionDomainEvent<Type extends string, Payload = {}> = DomainEvent<'Session', Type> & Payload;

export type SessionEvent =
  | SessionDomainEvent<'SessionCreated', { model: string; language: Language; ownerId: string | null }>
  | SessionDomainEvent<'SessionEnded'>
  | SessionDomainEvent<'SessionReopened'>
  | SessionDomainEvent<'ModelChanged', { model: string }>
  | SessionDomainEvent<'SubjectChanged', { subject: string }>
  | SessionDomainEvent<'TopicAdded', { topic: Topic }>
  | SessionDomainEvent<'TopicRemoved', { topicId: string }>
  | SessionDomainEvent<'TopicLabelChanged', { topicId: string; label: string }>
  | SessionDomainEvent<'TopicStatusChanged', { topicId: string; status: TopicStatus }>
  | SessionDomainEvent<'TopicSummaryChanged', { topicId: string; summary: string }>
  | SessionDomainEvent<'TopicMoved', { topicId: string; parentId: string | null }>
  | SessionDomainEvent<'NoteAdded', { note: Note }>
  | SessionDomainEvent<'NoteRemoved', { noteId: string }>
  | SessionDomainEvent<'NoteTitleChanged', { noteId: string; title: string }>
  | SessionDomainEvent<'NoteContentChanged', { noteId: string; content: string }>
  | SessionDomainEvent<'NoteMoved', { noteId: string; parentId: string | null }>
  | SessionDomainEvent<'TimerStarted', { duration: number }>
  | SessionDomainEvent<'TimerCleared'>
  | SessionDomainEvent<'TimerPaused'>
  | SessionDomainEvent<'TimerResumed'>
  | SessionDomainEvent<'MessageAdded', { message: Message }>
  | SessionDomainEvent<'ToolCallResultAdded', { result: ToolCallResult }>
  | SessionDomainEvent<'QuestionsAsked', { questions: Question[] }>
  | SessionDomainEvent<'AnswerSelected', { questionId: string; optionId: string; content: string; label: string }>
  | SessionDomainEvent<'PostureChanged', { posture: Posture | 'auto'; reason: string; forced: boolean }>
  | SessionDomainEvent<'SearchPerformed', { query: string; resultCount: number }>
  | SessionDomainEvent<'SummaryGenerated', { summary: Summary }>;

export type GetSessionEvent<Type extends SessionEvent['type']> = Extract<SessionEvent, { type: Type }>;

export class Session extends AggregateRoot<SessionEvent> {
  protected _aggregateType = 'Session';

  get id(): string {
    return this._id;
  }

  private _ownerId: string | null = null;

  get ownerId(): string | null {
    return this._ownerId;
  }

  private _ended = false;

  get ended(): boolean {
    return this._ended;
  }

  private _model: string = '';

  get model(): string {
    return this._model;
  }

  private _language: Language = 'en';

  get language(): Language {
    return this._language;
  }

  private _mindmap = new Mindmap();

  get mindmap() {
    return this._mindmap;
  }

  get subject(): string {
    return this._mindmap.subject;
  }

  get topics() {
    return this._mindmap.topics;
  }

  get notes() {
    return this._mindmap.notes;
  }

  private _timer: Timer | null = null;

  get timer() {
    return this._timer;
  }

  private _questions: Question[] = [];

  get questions() {
    return this._questions;
  }

  private _postureMode: PostureMode = 'auto';

  get postureMode(): PostureMode {
    return this._postureMode;
  }

  private _posture: Posture = 'socratic';

  get posture(): Posture {
    return this._posture;
  }

  private _events: SessionEvent[] = [];

  get events() {
    return this._events;
  }

  static create(
    generator: Generator,
    clock: Clock,
    params: { model: string; language: Language; ownerId: string | null },
  ) {
    const session = new Session(generator, clock);

    session.emit('SessionCreated', params);

    return session;
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
      SessionCreated: ({ model, language, ownerId }) => {
        this._ownerId = ownerId;
        this._model = model;
        this._language = language;
      },

      SessionEnded: () => {
        this._ended = true;
      },

      SessionReopened: () => {
        this._ended = false;
      },

      ModelChanged: ({ model }) => {
        this._model = model;
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

      QuestionsAsked: ({ questions }) => {
        this._questions.push(...questions);
      },

      AnswerSelected: () => {
        this._questions = [];
      },

      PostureChanged: ({ posture, forced }) => {
        if (posture !== 'auto') {
          this._posture = posture;
        }

        if (forced) {
          this._postureMode = posture === 'auto' ? 'auto' : 'forced';
        }
      },
    };

    if (event.type in handle) {
      (handle[event.type] as (event: SessionEvent) => void)(event);
    }

    this._mindmap = this._mindmap.apply(event);
    this._events.push(event);
  }

  setModel(model: string) {
    this.emit('ModelChanged', { model });
  }

  setSubject(subject: string) {
    this.emit('SubjectChanged', { subject });
  }

  addTopic({ label, parentId = null }: { label: string; parentId?: string | null }): string {
    if (parentId !== null) {
      assert(this.mindmap.hasTopic(parentId), new Error(`Cannot find topic "${parentId}"`));
    }

    const topic: Topic = {
      id: this.generator.id(),
      parentId,
      label,
    };

    if (parentId === null) {
      topic.status = 'pending';
    }

    this.emit('TopicAdded', { topic });

    return topic.id;
  }

  addTopics(labels: string[], parentId: string | null = null) {
    for (const label of labels) {
      this.addTopic({ label, parentId });
    }
  }

  updateTopic(topicId: string, { label, status, summary }: { label?: string; status?: TopicStatus; summary?: string }) {
    const topic = this.mindmap.getTopic(topicId);

    assert(topic, new Error(`Cannot find topic "${topicId}"`));

    if (label) {
      this.emit('TopicLabelChanged', { topicId, label });
    }

    if (status) {
      assert(topic.parentId === null, new Error('Only top-level topics can have a status'));

      this.emit('TopicStatusChanged', { topicId, status });
    }

    if (summary !== undefined) {
      this.emit('TopicSummaryChanged', { topicId, summary });
    }
  }

  removeTopic(topicId: string) {
    const mindmap = this.mindmap;

    if (!mindmap.hasTopic(topicId)) {
      return;
    }

    const subtree = mindmap.subtree(topicId);
    const removedIds = new Set(subtree.map((topic) => topic.id));

    const orphanedNotes = mindmap.notes.filter((note) => note.parentId !== null && removedIds.has(note.parentId));

    for (const note of orphanedNotes) {
      this.emit('NoteRemoved', { noteId: note.id });
    }

    for (const topic of subtree) {
      this.emit('TopicRemoved', { topicId: topic.id });
    }
  }

  moveTopic(topicId: string, parentId: string | null) {
    const mindmap = this.mindmap;

    assert(mindmap.hasTopic(topicId), new Error(`Cannot find topic "${topicId}"`));
    assert(topicId !== parentId, new Error('A topic cannot be its own parent'));

    if (parentId !== null) {
      assert(mindmap.hasTopic(parentId), new Error(`Cannot find topic "${parentId}"`));
      assert(!mindmap.isDescendant(parentId, topicId), new Error('Cannot move a topic into its own subtree'));
    }

    this.emit('TopicMoved', { topicId, parentId });
  }

  addNote({ title, content, parentId = null }: { title: string; content: string; parentId?: string | null }): string {
    if (parentId !== null) {
      assert(this.mindmap.hasTopic(parentId), new Error(`Cannot find topic "${parentId}"`));
    }

    const note: Note = {
      id: this.generator.id(),
      parentId,
      title,
      content,
    };

    this.emit('NoteAdded', { note });

    return note.id;
  }

  removeNote(noteId: string) {
    if (!this.mindmap.notes.some(hasId(noteId))) {
      return;
    }

    this.emit('NoteRemoved', { noteId });
  }

  updateNote(noteId: string, { title, content }: { title?: string; content?: string }) {
    const note = this.mindmap.getNote(noteId);

    assert(note, new Error(`Cannot find note "${noteId}"`));

    if (title) {
      this.emit('NoteTitleChanged', { noteId, title });
    }

    if (content) {
      this.emit('NoteContentChanged', { noteId, content });
    }
  }

  moveNote(noteId: string, parentId: string | null) {
    const note = this.mindmap.getNote(noteId);

    assert(note, new Error(`Cannot find note "${noteId}"`));

    if (parentId !== null) {
      assert(this.mindmap.hasTopic(parentId), new Error(`Cannot find topic "${parentId}"`));
    }

    this.emit('NoteMoved', { noteId, parentId });
  }

  // use error codes
  startTimer(duration: number) {
    assert(!this._timer, new Error('Un minuteur est déjà lancé'));

    this.emit('TimerStarted', { duration });
  }

  clearTimer() {
    assert(this._timer, new Error("Le minuteur n'est pas lancé"));

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
    const date = this.clock.now().toISOString();
    let message: Message;

    if (this.ended) {
      throw new Error('Session has ended');
    }

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

  askQuestions(questions: Array<{ content: string; options: Array<{ label: string; description?: string }> }>) {
    const withIds: Question[] = questions.map((question) => ({
      id: this.generator.id(),
      content: question.content,
      options: question.options.map((option) => ({ ...option, id: this.generator.id() })),
    }));

    this.emit('QuestionsAsked', { questions: withIds });
  }

  selectAnswer(questionId: string, optionId: string) {
    const question = this._questions.find(hasId(questionId));
    const option = question?.options.find(hasId(optionId));

    assert(question, new Error(`Cannot find question "${questionId}"`));
    assert(option, new Error(`Cannot find option "${optionId}"`));

    this.emit('AnswerSelected', { questionId, optionId, content: question.content, label: option.label });
  }

  setPosture(posture: Posture | 'auto', reason: string, forced: boolean) {
    this.emit('PostureChanged', { posture, reason, forced });
  }

  recordSearch(query: string, resultCount: number) {
    this.emit('SearchPerformed', { query, resultCount });
  }

  addSummary(summary: Summary) {
    this.emit('SummaryGenerated', { summary });
  }

  end() {
    if (this._ended) {
      throw new Error('Session is already ended');
    }

    this.emit('SessionEnded', {});
  }

  reopen() {
    if (!this._ended) {
      throw new Error('Session is not ended');
    }

    this.emit('SessionReopened', {});
  }
}
