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

  void it('adds a topic', () => {
    session.addTopic({ label: 'Topic' });

    const { id: topicId } = session.topics[0]!;

    assert.deepStrictEqual(session.topics, [{ id: topicId, label: 'Topic', status: 'pending' }]);

    expectEvent('TopicAdded', { topic: { id: topicId, label: 'Topic', status: 'pending' } });
  });

  void it('adds multiple topics at once', () => {
    session.addTopics(['Topic A', 'Topic B']);

    const [topicA, topicB] = session.topics;

    assert.deepStrictEqual(session.topics, [
      { id: topicA!.id, label: 'Topic A', status: 'pending' },
      { id: topicB!.id, label: 'Topic B', status: 'pending' },
    ]);

    expectEvent('TopicAdded', { topic: { id: topicA!.id, label: 'Topic A', status: 'pending' } });
    expectEvent('TopicAdded', { topic: { id: topicB!.id, label: 'Topic B', status: 'pending' } });
  });

  void it('removes a topic', () => {
    session.addTopic({ label: 'Topic' });

    const { id: topicId } = session.topics[0]!;

    session.removeTopic(topicId);

    assert.deepStrictEqual(session.topics, []);

    expectEvent('TopicRemoved', { topicId });
  });

  void it("changes a topic's label", () => {
    session.addTopic({ label: 'Initial' });

    const { id: topicId } = session.topics[0]!;

    session.updateTopic(topicId, { label: 'Changed' });

    assert.deepStrictEqual(session.topics, [{ id: topicId, label: 'Changed', status: 'pending' }]);

    expectEvent('TopicLabelChanged', { topicId, label: 'Changed' });
  });

  void it("changes a topic's status", () => {
    session.addTopic({ label: 'Topic' });

    const { id: topicId } = session.topics[0]!;

    session.updateTopic(topicId, { status: 'in_progress' });

    assert.deepStrictEqual(session.topics, [{ id: topicId, label: 'Topic', status: 'in_progress' }]);

    expectEvent('TopicStatusChanged', { topicId, status: 'in_progress' });
  });

  void it('adds a note', () => {
    session.addNote({ content: 'content' });

    const { id: noteId } = session.notes[0]!;

    assert.deepStrictEqual(session.notes, [{ id: noteId, content: 'content' }]);

    expectEvent('NoteAdded', { note: { id: noteId, content: 'content' } });
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

    assert.deepStrictEqual(session.notes, [{ id: noteId, content: 'updated' }]);

    expectEvent('NoteContentChanged', { noteId, content: 'updated' });
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

  void describe('mindmap', () => {
    const addNode = (label: string) => {
      session.addMindmapNode({ label });
      return session.mindmap.nodes.at(-1)!.id;
    };

    void it('adds a node', () => {
      session.addMindmapNode({ label: 'Concept' });

      const { id } = session.mindmap.nodes[0]!;

      assert.deepStrictEqual(session.mindmap.nodes, [{ id, label: 'Concept' }]);
      expectEvent('MindmapNodeAdded', { node: { id, label: 'Concept' } });
    });

    void it('adds a node attached to a parent with a default relation', () => {
      const parentId = addNode('Parent');

      session.addMindmapNode({ label: 'Child', parentId });

      const child = session.mindmap.nodes.at(-1)!;
      const edge = session.mindmap.edges[0]!;

      assert.deepStrictEqual(session.mindmap.edges, [
        { id: edge.id, source: parentId, target: child.id, type: 'elaborates' },
      ]);
    });

    void it('does not emit anything when the parent is unknown', () => {
      assert.throws(() => session.addMindmapNode({ label: 'Child', parentId: 'missing' }));
      assert.strictEqual(session.mindmap.nodes.length, 0);
      assert.strictEqual(session.peekDomainEvents().length, 0);
    });

    void it('renames a node', () => {
      const id = addNode('Old');

      session.updateMindmapNode(id, { label: 'New' });

      assert.deepStrictEqual(session.mindmap.nodes, [{ id, label: 'New' }]);
      expectEvent('MindmapNodeLabelChanged', { nodeId: id, label: 'New' });
    });

    void it('throws when renaming an unknown node', () => {
      assert.throws(() => session.updateMindmapNode('missing', { label: 'New' }));
    });

    void it('connects two nodes', () => {
      const a = addNode('A');
      const b = addNode('B');

      session.connectMindmapNodes(a, b, 'supports');

      const edge = session.mindmap.edges[0]!;

      assert.deepStrictEqual(session.mindmap.edges, [{ id: edge.id, source: a, target: b, type: 'supports' }]);
      expectEvent('MindmapEdgeAdded', { edge: { id: edge.id, source: a, target: b, type: 'supports' } });
    });

    void it('rejects invalid connections', () => {
      const a = addNode('A');
      const b = addNode('B');

      assert.throws(() => session.connectMindmapNodes(a, 'missing', 'relates'));
      assert.throws(() => session.connectMindmapNodes(a, a, 'relates'));

      session.connectMindmapNodes(a, b, 'relates');
      assert.throws(() => session.connectMindmapNodes(a, b, 'opposes'));
    });

    void it('allows both directions of a pair', () => {
      const a = addNode('A');
      const b = addNode('B');

      session.connectMindmapNodes(a, b, 'supports');
      session.connectMindmapNodes(b, a, 'opposes');

      assert.strictEqual(session.mindmap.edges.length, 2);
    });

    void it('cascades edge removal when a node is removed', () => {
      const a = addNode('A');
      const b = addNode('B');
      const c = addNode('C');

      session.connectMindmapNodes(a, b, 'relates');
      session.connectMindmapNodes(c, a, 'relates');
      session.connectMindmapNodes(b, c, 'relates');

      session.removeMindmapNode(a);

      assert.deepStrictEqual(
        session.mindmap.nodes.map(({ id }) => id),
        [b, c],
      );
      assert.deepStrictEqual(
        session.mindmap.edges.map(({ source, target }) => [source, target]),
        [[b, c]],
      );
    });

    void it('throws when removing an unknown node', () => {
      assert.throws(() => session.removeMindmapNode('missing'));
    });

    void it('disconnects nodes by oriented pair', () => {
      const a = addNode('A');
      const b = addNode('B');

      session.connectMindmapNodes(a, b, 'relates');
      session.disconnectMindmapNodes(a, b);

      assert.deepStrictEqual(session.mindmap.edges, []);
      assert.throws(() => session.disconnectMindmapNodes(a, b));
    });

    void it('removes an edge by id', () => {
      const a = addNode('A');
      const b = addNode('B');

      session.connectMindmapNodes(a, b, 'relates');

      const { id } = session.mindmap.edges[0]!;

      session.removeMindmapEdge(id);

      assert.deepStrictEqual(session.mindmap.edges, []);
      assert.throws(() => session.removeMindmapEdge(id));
    });

    void it('reconstructs the mindmap on replay', () => {
      const a = addNode('A');
      const b = addNode('B');

      session.connectMindmapNodes(a, b, 'supports');

      const replayed = Session.replay(generator, clock, session.id, session.peekDomainEvents());

      assert.deepStrictEqual(replayed.mindmap.nodes, session.mindmap.nodes);
      assert.deepStrictEqual(replayed.mindmap.edges, session.mindmap.edges);
    });
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

    void it('reconstructs topics from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.addTopic({ label: 'Topic A' });
      source.addTopic({ label: 'Topic B' });

      const topicAId = source.topics[0]!.id;
      const topicBId = source.topics[1]!.id;

      source.updateTopic(topicAId, { status: 'in_progress' });
      source.updateTopic(topicBId, { label: 'Topic B updated' });
      source.removeTopic(topicAId);

      const replayed = Session.replay(generator, clock, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.topics, source.topics);
    });

    void it('reconstructs notes from events', () => {
      const source = new Session(new StubGenerator(), clock);
      source.addNote({ content: 'Note A' });
      source.addNote({ content: 'Note B' });

      const noteAId = source.notes[0]!.id;
      const noteBId = source.notes[1]!.id;

      source.updateNote(noteAId, { content: 'Note A updated' });
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
