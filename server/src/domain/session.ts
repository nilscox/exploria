import { AggregateRoot, type DomainEvent } from '../aggregate-root.ts';
import { assert, hasId } from '../utils.ts';
import { Mindmap } from './mindmap.ts';
import { Timer } from './timer.ts';

import type { Clock } from '../adapters/clock.ts';
import type { Generator } from '../adapters/generator.ts';
import type { Language } from './i18n/index.ts';
import type { MindmapEdge, MindmapNode } from './mindmap.ts';
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
  | SessionDomainEvent<'DiscussionPathSelected', { pathId: string; label: string }>
  | SessionDomainEvent<'PostureChanged', { posture: Posture | 'auto'; reason: string; forced: boolean }>
  | SessionDomainEvent<'SearchPerformed', { query: string; resultCount: number }>
  | SessionDomainEvent<'MindmapNodeAdded', { node: MindmapNode }>
  | SessionDomainEvent<'MindmapNodeLabelChanged', { nodeId: string; label: string }>
  | SessionDomainEvent<'MindmapNodeRemoved', { nodeId: string }>
  | SessionDomainEvent<'MindmapEdgeAdded', { edge: MindmapEdge }>
  | SessionDomainEvent<'MindmapEdgeRemoved', { edgeId: string }>
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

  private _postureMode: PostureMode = 'auto';

  get postureMode(): PostureMode {
    return this._postureMode;
  }

  private _posture: Posture = 'socratic';

  get posture(): Posture {
    return this._posture;
  }

  private _mindmap: Mindmap = Mindmap.empty();

  get mindmap(): Mindmap {
    return this._mindmap;
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

      PostureChanged: ({ posture, forced }) => {
        if (posture !== 'auto') {
          this._posture = posture;
        }

        if (forced) {
          this._postureMode = posture === 'auto' ? 'auto' : 'forced';
        }
      },

      MindmapNodeAdded: ({ node }) => {
        this._mindmap = this._mindmap.withNode(node);
      },

      MindmapNodeLabelChanged: ({ nodeId, label }) => {
        this._mindmap = this._mindmap.withNodeLabel(nodeId, label);
      },

      MindmapNodeRemoved: ({ nodeId }) => {
        this._mindmap = this._mindmap.withoutNode(nodeId);
      },

      MindmapEdgeAdded: ({ edge }) => {
        this._mindmap = this._mindmap.withEdge(edge);
      },

      MindmapEdgeRemoved: ({ edgeId }) => {
        this._mindmap = this._mindmap.withoutEdge(edgeId);
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

  addTopic({ label }: Omit<Topic, 'id' | 'status'>) {
    const topic: Topic = {
      id: this.generator.id(),
      label,
      status: 'pending',
    };

    this.emit('TopicAdded', { topic });
  }

  addTopics(labels: string[]) {
    for (const label of labels) {
      this.addTopic({ label });
    }
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

  addMindmapNode({ label, parentId }: { label: string; parentId?: string }) {
    if (parentId !== undefined) {
      assert(this._mindmap.hasNode(parentId), new Error(`Cannot find mindmap node "${parentId}"`));
    }

    const node: MindmapNode = {
      id: this.generator.id(),
      label,
    };

    this.emit('MindmapNodeAdded', { node });

    if (parentId !== undefined) {
      this.connectMindmapNodes(parentId, node.id);
    }
  }

  updateMindmapNode(nodeId: string, { label }: { label: string }) {
    assert(this._mindmap.hasNode(nodeId), new Error(`Cannot find mindmap node "${nodeId}"`));

    this.emit('MindmapNodeLabelChanged', { nodeId, label });
  }

  removeMindmapNode(nodeId: string) {
    assert(this._mindmap.hasNode(nodeId), new Error(`Cannot find mindmap node "${nodeId}"`));

    for (const edge of this._mindmap.edgesConnectedTo(nodeId)) {
      this.emit('MindmapEdgeRemoved', { edgeId: edge.id });
    }

    this.emit('MindmapNodeRemoved', { nodeId });
  }

  connectMindmapNodes(source: string, target: string) {
    assert(this._mindmap.hasNode(source), new Error(`Cannot find mindmap node "${source}"`));
    assert(this._mindmap.hasNode(target), new Error(`Cannot find mindmap node "${target}"`));
    assert(source !== target, new Error('Cannot connect a mindmap node to itself'));
    assert(!this._mindmap.isAncestor(target, source), new Error('This connection would create a cycle'));

    const currentParent = this._mindmap.parentEdgeOf(target);

    if (currentParent?.source === source) {
      return;
    }

    if (currentParent !== undefined) {
      this.emit('MindmapEdgeRemoved', { edgeId: currentParent.id });
    }

    const edge: MindmapEdge = {
      id: this.generator.id(),
      source,
      target,
    };

    this.emit('MindmapEdgeAdded', { edge });
  }

  disconnectMindmapNodes(source: string, target: string) {
    const edge = this._mindmap.edgeBetween(source, target);

    assert(edge, new Error(`Cannot find mindmap edge from "${source}" to "${target}"`));

    this.emit('MindmapEdgeRemoved', { edgeId: edge.id });
  }

  removeMindmapEdge(edgeId: string) {
    assert(this._mindmap.edges.some(hasId(edgeId)), new Error(`Cannot find mindmap edge "${edgeId}"`));

    this.emit('MindmapEdgeRemoved', { edgeId });
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
