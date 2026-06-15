import { intervalToDuration, sub } from 'date-fns';
import EventEmitter from 'node:events';

import { sessionEventTypes } from '../shared';
import { assert, hasId, type DistributiveOmit } from './utils';

import type { DiscussionPath, GetSessionEvent, Message, Note, SessionEvent, Timer, Topic } from '../shared';

export class Session {
  private emitter = new EventEmitter();

  private _subject: string = '';

  get subject(): string {
    return this._subject;
  }

  set subject(subject: string) {
    this._subject = subject;
    this.emit({ type: 'subjectChanged', subject });
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

  private _events: Array<SessionEvent> = [];

  get events() {
    return this._events;
  }

  private now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;

    for (const type of sessionEventTypes) {
      this.addListener(type, (event) => this._events.push(event));
    }
  }

  static from(data: {
    subject: string;
    topics: Topic[];
    notes: Note[];
    duration?: number;
    timer?: Timer;
    messages: Message[];
    discussionPaths: DiscussionPath[];
    events: Array<SessionEvent & { date: Date }>;
  }) {
    const session = new Session();

    session._subject = data.subject;
    session._topics = data.topics;
    session._notes = data.notes;
    session._timer = data.timer ?? null;
    session._messages = data.messages;
    session._discussionPaths = data.discussionPaths;
    session._events = data.events;

    return session;
  }
  initializePlan(subject: string, topics: Array<Omit<Topic, 'status'>>) {
    this._subject = subject;
    this._topics = topics.map((topic) => ({ ...topic, status: 'pending' }));
    this.emit({ type: 'planInitialized', subject: this.subject, topics: this._topics });
  }

  addTopic({ id, label }: Omit<Topic, 'status'>) {
    const topic: Topic = { id, label, status: 'pending' };

    this._topics.push(topic);
    this.emit({ type: 'topicAdded', topic });
  }

  removeTopic(id: string) {
    const index = this._topics.findIndex(hasId(id));

    if (index >= 0) {
      this._topics.splice(index, 1);
      this.emit({ type: 'topicRemoved', id });
    }
  }

  updateTopic(id: string, { label, status }: Partial<Omit<Topic, 'id'>>) {
    const topic = this._topics.find(hasId(id));

    assert(topic, new Error(`Cannot find topic "${id}"`));

    if (label) {
      topic.label = label;
      this.emit({ type: 'topicLabelChanged', id, label });
    }

    if (status) {
      topic.status = status;
      this.emit({ type: 'topicStatusChanged', id, status });
    }
  }

  addNote(note: Note) {
    this._notes.push(note);
    this.emit({ type: 'noteAdded', note });
  }

  removeNote(id: string) {
    const index = this._notes.findIndex(hasId(id));

    if (index >= 0) {
      this._notes.splice(index, 1);
      this.emit({ type: 'noteRemoved', id });
    }
  }

  updateNote(id: string, { content }: Partial<Omit<Note, 'id'>>) {
    const note = this._notes.find(hasId(id));

    assert(note, new Error(`Cannot find note "${id}"`));

    if (content) {
      note.content = content;
      this.emit({ type: 'noteContentChanged', id, content });
    }
  }

  startTimer(duration: number) {
    const now = this.now();

    assert(!this._timer, new Error('Un chronomètre est déjà lancé'));

    this._timer = { duration, startedAt: now.toISOString() };
    this.emit({ type: 'timerStarted', duration });
  }

  pauseTimer() {
    assert(this._timer);

    this._timer.pausedAt = this.now().toISOString();
    this.emit({ type: 'timerPaused' });
  }

  resumeTimer() {
    assert(this._timer);
    assert(this._timer.pausedAt);

    const elapsed = intervalToDuration({
      start: this._timer.startedAt,
      end: this._timer.pausedAt,
    });

    this._timer.startedAt = sub(this.now(), elapsed).toISOString();
    delete this._timer.pausedAt;
    this.emit({ type: 'timerResumed' });
  }

  addMessage(message: Message) {
    if (message.role === 'assistant' && message.toolCalls?.length === 0) {
      delete message.toolCalls;
    }

    this._messages.push(message);
    this.emit({ type: 'messageAdded', message });
  }

  setDiscussionPath(paths: DiscussionPath[]) {
    this._discussionPaths = paths;
    this.emit({ type: 'discussionPathsSet', paths });
  }

  selectDiscussionPath(id: string) {
    const path = this.discussionPaths.find(hasId(id));

    assert(path, new Error(`Cannot find discussion path "${id}"`));

    this.emit({ type: 'discussionPathSelected', id });
  }

  private emit({ type, ...event }: DistributiveOmit<SessionEvent, 'date'>) {
    this.emitter.emit(type, { ...event, type, date: this.now() });
  }

  addListener<Event extends SessionEvent, Type extends Event['type']>(
    type: Type,
    listener: (event: GetSessionEvent<Type>) => void,
  ) {
    this.emitter.addListener(type, listener);

    return () => {
      this.emitter.removeListener(type, listener);
    };
  }
}
