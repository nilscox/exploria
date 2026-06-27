import { sub } from 'date-fns';
import assert, { AssertionError } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../adapters/clock';
import { StubGenerator } from '../adapters/generator';
import { Session, type SessionEvent } from './session';

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
    assert.strictEqual(error.message, 'Un chronomètre est déjà lancé');
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
      message: { date: clock.date, role: 'user', content: 'content' },
    });
  });

  void it('adds an assistant message', () => {
    session.addMessage('assistant', 'content', { model: 'model', toolCalls: [] });

    expectEvent('MessageAdded', {
      message: { date: clock.date, role: 'assistant', content: 'content', model: 'model' },
    });
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

    expectEvent('SummaryAdded', { summary });
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
