import { intervalToDuration, sub } from 'date-fns';

import { AggregateRoot } from './aggregate-root';
import { di } from './di';
import { assert, hasId } from './utils';

import type { DiscussionPath, Message, Note, SessionEvent, Timer, Topic } from '../shared';

export class Session extends AggregateRoot<SessionEvent> {
  get id(): string {
    return this._id;
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

  static from(data: {
    id: string;
    subject: string;
    topics: Topic[];
    notes: Note[];
    timer: Timer | null;
    messages: Message[];
    discussionPaths: DiscussionPath[];
  }) {
    const session = new Session(data.id);

    session._subject = data.subject;
    session._topics = data.topics;
    session._notes = data.notes;
    session._timer = data.timer;
    session._messages = data.messages;
    session._discussionPaths = data.discussionPaths;

    return session;
  }

  initializePlan(subject: string, topics: Array<Omit<Topic, 'status'>>) {
    this._subject = subject;
    this._topics = topics.map((topic) => ({ ...topic, status: 'pending' }));

    this.emit({ type: 'planInitialized', subject: this.subject, topics: this._topics });
  }

  setSubject(subject: string) {
    this._subject = subject;

    this.emit({ type: 'subjectChanged', subject });
  }

  addTopic({ id, label }: Omit<Topic, 'status'>) {
    const topic: Topic = { id, label, status: 'pending' };

    this._topics.push(topic);

    this.emit({ type: 'topicAdded', topic });
  }

  removeTopic(topicId: string) {
    const index = this._topics.findIndex(hasId(topicId));

    if (index >= 0) {
      this._topics.splice(index, 1);

      this.emit({ type: 'topicRemoved', topicId });
    }
  }

  updateTopic(topicId: string, { label, status }: Partial<Omit<Topic, 'id'>>) {
    const topic = this._topics.find(hasId(topicId));

    assert(topic, new Error(`Cannot find topic "${topicId}"`));

    if (label) {
      topic.label = label;

      this.emit({ type: 'topicLabelChanged', topicId, label });
    }

    if (status) {
      topic.status = status;

      this.emit({ type: 'topicStatusChanged', topicId, status });
    }
  }

  addNote(note: Note) {
    this._notes.push(note);

    this.emit({ type: 'noteAdded', note });
  }

  removeNote(noteId: string) {
    const index = this._notes.findIndex(hasId(noteId));

    if (index >= 0) {
      this._notes.splice(index, 1);

      this.emit({ type: 'noteRemoved', noteId });
    }
  }

  updateNote(noteId: string, { content }: Partial<Omit<Note, 'id'>>) {
    const note = this._notes.find(hasId(noteId));

    assert(note, new Error(`Cannot find note "${noteId}"`));

    if (content) {
      note.content = content;

      this.emit({ type: 'noteContentChanged', noteId, content });
    }
  }

  startTimer(duration: number) {
    const now = this.now();

    assert(!this._timer, new Error('Un chronomètre est déjà lancé'));

    this._timer = { duration, startedAt: now.toISOString() };

    this.emit({ type: 'timerStarted', duration });
  }

  clearTimer() {
    assert(this._timer, new Error("Le chronomètre n'est pas lancé"));

    this._timer = null;

    this.emit({ type: 'timerCleared' });
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

  selectDiscussionPath(discussionPathId: string) {
    const path = this.discussionPaths.find(hasId(discussionPathId));

    assert(path, new Error(`Cannot find discussion path "${discussionPathId}"`));

    this.emit({ type: 'discussionPathSelected', discussionPathId });
  }

  private now() {
    return di.resolve('date').now();
  }
}
