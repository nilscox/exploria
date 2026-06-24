import { sub } from 'date-fns';
import assert, { AssertionError } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../adapters/clock';
import { StubGenerator } from '../adapters/generator';
import { StubUiNotifier } from '../adapters/logger';
import { Session, type SessionEvent } from './session';

void describe('Session', () => {
  let generator: StubGenerator;
  let clock: StubClock;
  let uiNotifier: StubUiNotifier;
  let session: Session;

  beforeEach(() => {
    generator = new StubGenerator();
    clock = new StubClock();
    uiNotifier = new StubUiNotifier();
    session = new Session(generator, clock, uiNotifier);
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

  void it('initializes a plan', () => {
    session.initializePlan('Subject', [{ label: 'Topic' }]);

    const { id: topicId } = session.topics[0]!;

    assert.strictEqual(session.subject, 'Subject');
    assert.deepStrictEqual(session.topics, [{ id: topicId, label: 'Topic', status: 'pending' }]);

    expectEvent('PlanInitialized', {
      subject: 'Subject',
      topics: [{ id: topicId, label: 'Topic', status: 'pending' }],
    });
  });

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
    assert.strictEqual(session.timer.startedAt, clock.date);

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
    assert.strictEqual(session.timer.pausedAt, clock.date);

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
    session.setDiscussionPath([{ label: 'Path A', description: 'A description' }]);

    const { id: pathId } = session.discussionPaths[0]!;

    assert.deepStrictEqual(session.discussionPaths, [{ id: pathId, label: 'Path A', description: 'A description' }]);

    expectEvent('DiscussionPathsSet', {
      paths: [{ id: pathId, label: 'Path A', description: 'A description' }],
    });
  });

  void it('selects a discussion path', () => {
    session.setDiscussionPath([{ label: 'Path A' }]);

    const { id: pathId } = session.discussionPaths[0]!;

    session.selectDiscussionPath(pathId);

    assert.deepStrictEqual(session.discussionPaths, []);

    expectEvent('DiscussionPathSelected', { pathId });
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

  void describe('replay', () => {
    void it('reconstructs model and subject from events', () => {
      const source = new Session(new StubGenerator(), clock, uiNotifier);
      source.setModel('gpt-4o');
      source.setSubject('My subject');

      const replayed = Session.replay(generator, clock, uiNotifier, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.id, source.id);
      assert.strictEqual(replayed.model, 'gpt-4o');
      assert.strictEqual(replayed.subject, 'My subject');
    });

    void it('reconstructs topics from events', () => {
      const source = new Session(new StubGenerator(), clock, uiNotifier);
      source.addTopic({ label: 'Topic A' });
      source.addTopic({ label: 'Topic B' });

      const topicAId = source.topics[0]!.id;
      const topicBId = source.topics[1]!.id;

      source.updateTopic(topicAId, { status: 'in_progress' });
      source.updateTopic(topicBId, { label: 'Topic B updated' });
      source.removeTopic(topicAId);

      const replayed = Session.replay(generator, clock, uiNotifier, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.topics, source.topics);
    });

    void it('reconstructs notes from events', () => {
      const source = new Session(new StubGenerator(), clock, uiNotifier);
      source.addNote({ content: 'Note A' });
      source.addNote({ content: 'Note B' });

      const noteAId = source.notes[0]!.id;
      const noteBId = source.notes[1]!.id;

      source.updateNote(noteAId, { content: 'Note A updated' });
      source.removeNote(noteBId);

      const replayed = Session.replay(generator, clock, uiNotifier, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.notes, source.notes);
    });

    void it('reconstructs timer from events', () => {
      const source = new Session(new StubGenerator(), clock, uiNotifier);
      source.startTimer(60);
      clock.advance({ minutes: 5 });
      source.pauseTimer();
      clock.advance({ minutes: 2 });
      source.resumeTimer();

      const replayed = Session.replay(generator, clock, uiNotifier, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.timer, source.timer);
    });

    void it('reconstructs timer cleared', () => {
      const source = new Session(new StubGenerator(), clock, uiNotifier);
      source.startTimer(60);
      source.clearTimer();

      const replayed = Session.replay(generator, clock, uiNotifier, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.timer, null);
    });

    void it('reconstructs discussion paths from events', () => {
      const source = new Session(new StubGenerator(), clock, uiNotifier);
      source.setDiscussionPath([{ label: 'Path A' }, { label: 'Path B', description: 'desc' }]);

      const replayed = Session.replay(generator, clock, uiNotifier, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.discussionPaths, source.discussionPaths);
    });

    void it('clears discussion paths after selection', () => {
      const source = new Session(new StubGenerator(), clock, uiNotifier);
      source.setDiscussionPath([{ label: 'Path A' }]);

      const { id: pathId } = source.discussionPaths[0]!;

      source.selectDiscussionPath(pathId);

      const replayed = Session.replay(generator, clock, uiNotifier, source.id, source.peekDomainEvents());

      assert.deepStrictEqual(replayed.discussionPaths, []);
    });

    void it('populates session.events with replayed events', () => {
      const source = new Session(new StubGenerator(), clock, uiNotifier);
      source.addMessage('user', 'hello');
      source.addMessage('assistant', 'world', { model: 'gpt-4o', toolCalls: [] });

      const replayed = Session.replay(generator, clock, uiNotifier, source.id, source.peekDomainEvents());

      assert.strictEqual(replayed.events.length, 2);
      assert.strictEqual(replayed.events[0]?.type, 'MessageAdded');
      assert.strictEqual(replayed.events[1]?.type, 'MessageAdded');
    });
  });
});
