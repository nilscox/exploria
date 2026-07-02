import { AggregateRoot, type DomainEvent } from '../aggregate-root.ts';
import { assert, hasId } from '../utils.ts';
import { Mindmap, type MindmapNode } from './mindmap.ts';
import { Timer } from './timer.ts';

import type { Clock } from '../adapters/clock.ts';
import type { Generator } from '../adapters/generator.ts';
import type { Language } from './i18n/index.ts';
import type { Summary } from './summary.ts';

export type TopicStatus = 'pending' | 'in_progress' | 'done';

export const postures = ['socratic', 'devils_advocate', 'examiner', 'advisor', 'mirror'] as const;

export type Posture = (typeof postures)[number];

export type PostureMode = 'auto' | 'forced';

export type Topic = {
  id: string;
  label: string;
  status: TopicStatus;
};

export type Note = {
  id: string;
  content: string;
  parentId: string | null;
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

export type DiscussionPath = {
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
  | SessionDomainEvent<'MindmapNodeAdded', { node: MindmapNode }>
  | SessionDomainEvent<'MindmapNodeRemoved', { nodeId: string }>
  | SessionDomainEvent<'MindmapNodeLabelChanged', { nodeId: string; label: string }>
  | SessionDomainEvent<'MindmapNodeStatusChanged', { nodeId: string; status: TopicStatus }>
  | SessionDomainEvent<'MindmapNodeMoved', { nodeId: string; parentId: string | null }>
  | SessionDomainEvent<'NoteAdded', { note: Note }>
  | SessionDomainEvent<'NoteRemoved', { noteId: string }>
  | SessionDomainEvent<'NoteContentChanged', { noteId: string; content: string }>
  | SessionDomainEvent<'NoteMoved', { noteId: string; parentId: string | null }>
  | SessionDomainEvent<'TimerStarted', { duration: number }>
  | SessionDomainEvent<'TimerCleared'>
  | SessionDomainEvent<'TimerPaused'>
  | SessionDomainEvent<'TimerResumed'>
  | SessionDomainEvent<'MessageAdded', { message: Message }>
  | SessionDomainEvent<'ToolCallResultAdded', { result: ToolCallResult }>
  | SessionDomainEvent<'DiscussionPathsSet', { paths: DiscussionPath[] }>
  | SessionDomainEvent<'DiscussionPathSelected', { pathId: string; label: string }>
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

  private _subject: string = '';

  get subject(): string {
    return this._subject;
  }

  private _nodes: MindmapNode[] = [];

  get nodes() {
    return this._nodes;
  }

  get mindmap() {
    return new Mindmap(this._nodes);
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

      SubjectChanged: ({ subject }) => {
        this._subject = subject;
      },

      MindmapNodeAdded: ({ node }) => {
        this._nodes.push(node);
      },

      MindmapNodeRemoved: ({ nodeId }) => {
        this._nodes = this._nodes.filter(({ id }) => id !== nodeId);
      },

      MindmapNodeLabelChanged: ({ nodeId, label }) => {
        const node = this._nodes.find(hasId(nodeId));
        assert(node);
        node.label = label;
      },

      MindmapNodeStatusChanged: ({ nodeId, status }) => {
        const node = this._nodes.find(hasId(nodeId));
        assert(node);
        node.status = status;
      },

      MindmapNodeMoved: ({ nodeId, parentId }) => {
        const node = this._nodes.find(hasId(nodeId));
        assert(node);
        node.parentId = parentId;

        if (parentId === null) {
          node.status ??= 'pending';
        } else {
          delete node.status;
        }
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

      NoteMoved: ({ noteId, parentId }) => {
        const note = this._notes.find(hasId(noteId));
        assert(note);
        note.parentId = parentId;
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

    this._events.push(event);
  }

  setModel(model: string) {
    this.emit('ModelChanged', { model });
  }

  setSubject(subject: string) {
    this.emit('SubjectChanged', { subject });
  }

  addNode({ label, parentId = null }: { label: string; parentId?: string | null }): string {
    if (parentId !== null) {
      assert(this.mindmap.has(parentId), new Error(`Cannot find node "${parentId}"`));
    }

    const node: MindmapNode = {
      id: this.generator.id(),
      parentId,
      label,
    };

    if (parentId === null) {
      node.status = 'pending';
    }

    this.emit('MindmapNodeAdded', { node });

    return node.id;
  }

  addNodes(labels: string[], parentId: string | null = null) {
    for (const label of labels) {
      this.addNode({ label, parentId });
    }
  }

  updateNode(nodeId: string, { label, status }: { label?: string; status?: TopicStatus }) {
    const node = this.mindmap.get(nodeId);

    assert(node, new Error(`Cannot find node "${nodeId}"`));

    if (label) {
      this.emit('MindmapNodeLabelChanged', { nodeId, label });
    }

    if (status) {
      assert(node.parentId === null, new Error('Only top-level nodes can have a status'));

      this.emit('MindmapNodeStatusChanged', { nodeId, status });
    }
  }

  removeNode(nodeId: string) {
    const mindmap = this.mindmap;

    if (!mindmap.has(nodeId)) {
      return;
    }

    const subtree = mindmap.subtree(nodeId);
    const removedIds = new Set(subtree.map((node) => node.id));

    const orphanedNotes = this._notes.filter((note) => note.parentId !== null && removedIds.has(note.parentId));

    for (const note of orphanedNotes) {
      this.emit('NoteRemoved', { noteId: note.id });
    }

    for (const node of subtree) {
      this.emit('MindmapNodeRemoved', { nodeId: node.id });
    }
  }

  moveNode(nodeId: string, parentId: string | null) {
    const mindmap = this.mindmap;

    assert(mindmap.has(nodeId), new Error(`Cannot find node "${nodeId}"`));
    assert(nodeId !== parentId, new Error('A node cannot be its own parent'));

    if (parentId !== null) {
      assert(mindmap.has(parentId), new Error(`Cannot find node "${parentId}"`));
      assert(!mindmap.isDescendant(parentId, nodeId), new Error('Cannot move a node into its own subtree'));
    }

    this.emit('MindmapNodeMoved', { nodeId, parentId });
  }

  addNote({ content, parentId = null }: { content: string; parentId?: string | null }): string {
    if (parentId !== null) {
      assert(this.mindmap.has(parentId), new Error(`Cannot find node "${parentId}"`));
    }

    const note: Note = {
      id: this.generator.id(),
      content,
      parentId,
    };

    this.emit('NoteAdded', { note });

    return note.id;
  }

  removeNote(noteId: string) {
    if (!this._notes.some(hasId(noteId))) {
      return;
    }

    this.emit('NoteRemoved', { noteId });
  }

  updateNote(noteId: string, { content }: { content?: string }) {
    const note = this._notes.find(hasId(noteId));

    assert(note, new Error(`Cannot find note "${noteId}"`));

    if (content) {
      this.emit('NoteContentChanged', { noteId, content });
    }
  }

  moveNote(noteId: string, parentId: string | null) {
    const note = this._notes.find(hasId(noteId));

    assert(note, new Error(`Cannot find note "${noteId}"`));

    if (parentId !== null) {
      assert(this.mindmap.has(parentId), new Error(`Cannot find node "${parentId}"`));
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

  setDiscussionPaths(paths: Array<Omit<DiscussionPath, 'id'>>) {
    const withIds: DiscussionPath[] = paths.map((path) => ({ ...path, id: this.generator.id() }));

    this.emit('DiscussionPathsSet', { paths: withIds });
  }

  selectDiscussionPath(pathId: string) {
    const path = this._discussionPaths.find(hasId(pathId));

    assert(path, new Error(`Cannot find discussion path "${pathId}"`));

    this.emit('DiscussionPathSelected', { pathId, label: path.label });
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
