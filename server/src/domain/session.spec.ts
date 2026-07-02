import { sub } from 'date-fns';
import assert, { AssertionError } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../adapters/clock.ts';
import { StubGenerator } from '../adapters/generator.ts';
import { Session, type SessionEvent } from './session.ts';

void describe('Session', () => {
  let generator: StubGenerator;
  let clock: StubClock;
  let session: Session;

  beforeEach(() => {
    generator = new StubGenerator();
    clock = new StubClock();
    session = new Session(generator, clock);
  });

  const expectEvent = <Type extends SessionEvent['type']>(
    type: Type,
    expected: Omit<Extract<SessionEvent, { type: Type }>, 'occurredAt' | 'aggregateType' | 'aggregateId' | 'type'>,
  ) => {
    const events = session.peekDomainEvents();

    const result = events.some((event) => {
      try {
        assert.strictEqual(event.type, type);
        assert.partialDeepStrictEqual(event, expected);
        return true;
      } catch {
        return false;
      }
    });

    assert(
      result,
      new AssertionError({
        message: 'Event not found',
        actual: events,
        expected,
      }),
    );
  };

  void it('changes the subject', () => {
    session.setSubject('Subject');

    assert.strictEqual(session.subject, 'Subject');

    expectEvent('SubjectChanged', { subject: 'Subject' });
  });

  void it('adds a top-level node', () => {
    session.addNode({ label: 'Node' });

    const { id: nodeId } = session.nodes[0]!;

    assert.deepStrictEqual(session.nodes, [{ id: nodeId, parentId: null, label: 'Node', status: 'pending' }]);

    expectEvent('MindmapNodeAdded', { node: { id: nodeId, parentId: null, label: 'Node', status: 'pending' } });
  });

  void it('adds multiple nodes at once', () => {
    session.addNodes(['Node A', 'Node B']);

    const [nodeA, nodeB] = session.nodes;

    assert.deepStrictEqual(session.nodes, [
      { id: nodeA!.id, parentId: null, label: 'Node A', status: 'pending' },
      { id: nodeB!.id, parentId: null, label: 'Node B', status: 'pending' },
    ]);
  });

  void it('adds a nested node without a status', () => {
    const parentId = session.addNode({ label: 'Parent' });
    const childId = session.addNode({ label: 'Child', parentId });

    assert.deepStrictEqual(session.nodes[1], { id: childId, parentId, label: 'Child' });

    expectEvent('MindmapNodeAdded', { node: { id: childId, parentId, label: 'Child' } });
  });

  void it('fails to add a node under a missing parent', () => {
    assert.throws(() => session.addNode({ label: 'Child', parentId: 'missing' }));
  });

  void it('derives the top-level nodes as the mind map topics', () => {
    const topicId = session.addNode({ label: 'Topic' });
    session.addNode({ label: 'Sub', parentId: topicId });

    assert.deepStrictEqual(
      session.mindmap.topics().map((node) => node.id),
      [topicId],
    );
  });

  void it('removes a node', () => {
    const nodeId = session.addNode({ label: 'Node' });

    session.removeNode(nodeId);

    assert.deepStrictEqual(session.nodes, []);

    expectEvent('MindmapNodeRemoved', { nodeId });
  });

  void it('removes a node with its descendants and their notes', () => {
    const parentId = session.addNode({ label: 'Parent' });
    const childId = session.addNode({ label: 'Child', parentId });

    session.addNote({ content: 'note', parentId: childId });

    session.removeNode(parentId);

    assert.deepStrictEqual(session.nodes, []);
    assert.deepStrictEqual(session.notes, []);
  });

  void it("changes a node's label", () => {
    const nodeId = session.addNode({ label: 'Initial' });

    session.updateNode(nodeId, { label: 'Changed' });

    assert.strictEqual(session.nodes[0]!.label, 'Changed');

    expectEvent('MindmapNodeLabelChanged', { nodeId, label: 'Changed' });
  });

  void it("changes a node's status", () => {
    const nodeId = session.addNode({ label: 'Node' });

    session.updateNode(nodeId, { status: 'in_progress' });

    assert.strictEqual(session.nodes[0]!.status, 'in_progress');

    expectEvent('MindmapNodeStatusChanged', { nodeId, status: 'in_progress' });
  });

  void it('moves a node under another parent', () => {
    const nodeId = session.addNode({ label: 'Node' });
    const parentId = session.addNode({ label: 'Parent' });

    session.moveNode(nodeId, parentId);

    assert.strictEqual(session.nodes[0]!.parentId, parentId);

    expectEvent('MindmapNodeMoved', { nodeId, parentId });
  });

  void it('fails to move a node into its own subtree', () => {
    const parentId = session.addNode({ label: 'Parent' });
    const childId = session.addNode({ label: 'Child', parentId });

    assert.throws(() => session.moveNode(parentId, childId));
    assert.throws(() => session.moveNode(parentId, parentId));
  });

  void it('fails to set a status on a nested node', () => {
    const parentId = session.addNode({ label: 'Parent' });
    const childId = session.addNode({ label: 'Child', parentId });

    assert.throws(() => session.updateNode(childId, { status: 'in_progress' }));
  });

  void it('clears the status when a top-level node is nested', () => {
    const nodeId = session.addNode({ label: 'Node' });
    const parentId = session.addNode({ label: 'Parent' });

    session.updateNode(nodeId, { status: 'in_progress' });
    session.moveNode(nodeId, parentId);

    assert.strictEqual(session.nodes[0]!.status, undefined);
  });

  void it('restores a status when a nested node is promoted to top level', () => {
    const parentId = session.addNode({ label: 'Parent' });
    const childId = session.addNode({ label: 'Child', parentId });

    session.moveNode(childId, null);

    assert.strictEqual(session.nodes[1]!.status, 'pending');
  });

  void it('adds a note attached to a node', () => {
    const nodeId = session.addNode({ label: 'Node' });

    session.addNote({ content: 'content', parentId: nodeId });

    const { id: noteId } = session.notes[0]!;

    assert.deepStrictEqual(session.notes, [{ id: noteId, content: 'content', parentId: nodeId }]);

    expectEvent('NoteAdded', { note: { id: noteId, content: 'content', parentId: nodeId } });
  });

  void it('adds a note attached to the root by default', () => {
    session.addNote({ content: 'content' });

    assert.strictEqual(session.notes[0]!.parentId, null);
  });

  void it('removes a note', () => {
    session.addNote({ content: 'content' });

    const { id: noteId } = session.notes[0]!;

    session.removeNote(noteId);

    assert.deepStrictEqual(session.notes, []);

    expectEvent('NoteRemoved', { noteId });
  });

  void it("changes a note's content", () => {
    session.addNote({ content: 'initial' });

    const { id: noteId } = session.notes[0]!;

    session.updateNote(noteId, { content: 'updated' });

    assert.strictEqual(session.notes[0]!.content, 'updated');

    expectEvent('NoteContentChanged', { noteId, content: 'updated' });
  });

  void it('moves a note to another node', () => {
    const nodeId = session.addNode({ label: 'Node' });

    session.addNote({ content: 'content' });

    const { id: noteId } = session.notes[0]!;

    session.moveNote(noteId, nodeId);

    assert.strictEqual(session.notes[0]!.parentId, nodeId);

    expectEvent('NoteMoved', { noteId, parentId: nodeId });
  });

  void it('starts and clears the timer', () => {
    session.startTimer(60);

    assert(session.timer);
    assert.strictEqual(session.timer.duration, 60);
    assert.deepStrictEqual(session.timer.startedAt, clock.date);

    expectEvent('TimerStarted', { duration: 60 });

    session.clearTimer();
    assert(session.timer === null);

    expectEvent('TimerCleared', {});
  });

  void it('fails to start the timer when there is one already', () => {
    let error: unknown;

    session.startTimer(60);

    try {
      session.startTimer(60);
    } catch (err) {
      error = err;
    }

    assert(error instanceof Error);
    assert.strictEqual(error.message, 'Un minuteur est déjà lancé');
  });

  void it('pauses and resumes the timer', () => {
    session.startTimer(60);

    clock.advance({ minutes: 5 });
    session.pauseTimer();

    assert(session.timer);
    assert.deepStrictEqual(session.timer.pausedAt, clock.date);

    expectEvent('TimerPaused', {});

    clock.advance({ minutes: 5 });
    session.resumeTimer();

    assert(session.timer);
    assert.deepEqual(session.timer.startedAt, sub(clock.date, { minutes: 5 }));
    assert.strictEqual(session.timer.pausedAt, undefined);

    expectEvent('TimerResumed', {});
  });

  void it('changes the model', () => {
    session.setModel('gpt-4o');

    assert.strictEqual(session.model, 'gpt-4o');

    expectEvent('ModelChanged', { model: 'gpt-4o' });
  });

  void it('sets discussion paths', () => {
    session.setDiscussionPaths([{ label: 'Path A', description: 'A description' }]);

    const { id: pathId } = session.discussionPaths[0]!;

    assert.deepStrictEqual(session.discussionPaths, [{ id: pathId, label: 'Path A', description: 'A description' }]);

    expectEvent('DiscussionPathsSet', {
      paths: [{ id: pathId, label: 'Path A', description: 'A description' }],
    });
  });

  void it('selects a discussion path', () => {
    session.setDiscussionPaths([{ label: 'Path A' }]);

    const { id: pathId } = session.discussionPaths[0]!;

    session.selectDiscussionPath(pathId);

    assert.deepStrictEqual(session.discussionPaths, []);

    expectEvent('DiscussionPathSelected', { pathId, label: 'Path A' });
  });

  void it('defaults to automatic mode and the socratic posture', () => {
    assert.strictEqual(session.postureMode, 'auto');
    assert.strictEqual(session.posture, 'socratic');
  });

  void it('changes the posture from the assistant without leaving automatic mode', () => {
    session.setPosture('mirror', 'You seem overwhelmed', false);

    assert.strictEqual(session.posture, 'mirror');
    assert.strictEqual(session.postureMode, 'auto');

    expectEvent('PostureChanged', { posture: 'mirror', reason: 'You seem overwhelmed', forced: false });
  });

  void it('forces a posture from the user', () => {
    session.setPosture('examiner', '', true);

    assert.strictEqual(session.posture, 'examiner');
    assert.strictEqual(session.postureMode, 'forced');

    expectEvent('PostureChanged', { posture: 'examiner', reason: '', forced: true });
  });

  void it('returns to automatic mode while keeping the active posture', () => {
    session.setPosture('examiner', '', true);
    session.setPosture('auto', '', true);

    assert.strictEqual(session.postureMode, 'auto');
    assert.strictEqual(session.posture, 'examiner');
  });

  void it('adds a message', () => {
    session.addMessage('user', 'content');

    expectEvent('MessageAdded', {
      message: { date: clock.date.toISOString(), role: 'user', content: 'content' },
    });
  });

  void it('adds an assistant message', () => {
    session.addMessage('assistant', 'content', { model: 'model', toolCalls: [] });

    expectEvent('MessageAdded', {
      message: { date: clock.date.toISOString(), role: 'assistant', content: 'content', model: 'model' },
    });
  });

  void it('fails to add a message when the session has ended', () => {
    session.end();
    assert.throws(() => session.addMessage('user', ''));
  });

  void it('fails to add an assistant message without params', () => {
    assert.throws(() => {
      // @ts-expect-error
      session.addMessage('assistant', '');
    });
  });

  void it('adds a summary', () => {
    const summary = {
      summary: 'A good session.',
      keyPoints: ['Key idea'],
      biases: [],
      blindSpots: [],
      tensions: [],
      openQuestions: [],
      conclusion: null,
    };

    session.addSummary(summary);

    expectEvent('SummaryGenerated', { summary });
  });

  void it('ends an reopens a session', () => {
    session.end();

    assert.strictEqual(session.ended, true);
    expectEvent('SessionEnded', {});
    assert.throws(() => session.end());

    session.reopen();

    assert.strictEqual(session.ended, false);
    expectEvent('SessionReopened', {});
    assert.throws(() => session.reopen());
  });

  void describe('replay', () => {
    void it('reconstructs model and subject from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.setModel('gpt-4o');
      source.setSubject('My subject');

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.id, source.id);
      assert.strictEqual(replayed.model, 'gpt-4o');
      assert.strictEqual(replayed.subject, 'My subject');
    });

    void it('reconstructs mind map nodes from events', () => {
      const source = new Session(new StubGenerator(), clock);
      const nodeAId = source.addNode({ label: 'Node A' });
      const nodeBId = source.addNode({ label: 'Node B' });
      const childId = source.addNode({ label: 'Child', parentId: nodeAId });

      source.updateNode(nodeAId, { status: 'in_progress' });
      source.updateNode(nodeBId, { label: 'Node B updated' });
      source.moveNode(childId, nodeBId);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.nodes, source.nodes);
    });

    void it('reconstructs notes from events', () => {
      const source = new Session(new StubGenerator(), clock);
      const nodeId = source.addNode({ label: 'Node' });
      source.addNote({ content: 'Note A', parentId: nodeId });
      source.addNote({ content: 'Note B' });

      const noteAId = source.notes[0]!.id;
      const noteBId = source.notes[1]!.id;

      source.updateNote(noteAId, { content: 'Note A updated' });
      source.moveNote(noteAId, null);
      source.removeNote(noteBId);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.notes, source.notes);
    });

    void it('reconstructs timer from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.startTimer(60);
      clock.advance({ minutes: 5 });
      source.pauseTimer();
      clock.advance({ minutes: 2 });
      source.resumeTimer();

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.timer, source.timer);
    });

    void it('reconstructs timer cleared', () => {
      const source = new Session(new StubGenerator(), clock);
      source.startTimer(60);
      source.clearTimer();

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.timer, null);
    });

    void it('reconstructs discussion paths from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.setDiscussionPaths([{ label: 'Path A' }, { label: 'Path B', description: 'desc' }]);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.discussionPaths, source.discussionPaths);
    });

    void it('clears discussion paths after selection', () => {
      const source = new Session(new StubGenerator(), clock);
      source.setDiscussionPaths([{ label: 'Path A' }]);

      const { id: pathId } = source.discussionPaths[0]!;

      source.selectDiscussionPath(pathId);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.discussionPaths, []);
    });

    void it('reconstructs posture and mode from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.setPosture('devils_advocate', 'reason', false);
      source.setPosture('mirror', '', true);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.posture, source.posture);
      assert.strictEqual(replayed.postureMode, source.postureMode);
    });

    void it('populates session.events with replayed events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.addMessage('user', 'hello');
      source.addMessage('assistant', 'world', { model: 'gpt-4o', toolCalls: [] });

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.events.length, 2);
      assert.strictEqual(replayed.events[0]?.type, 'MessageAdded');
      assert.strictEqual(replayed.events[1]?.type, 'MessageAdded');
    });
  });
});
