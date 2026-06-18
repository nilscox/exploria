import { sub } from 'date-fns';
import assert, { AssertionError } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock, StubGenerator, StubUiNotifier } from '../di';
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

    generator.nextId = 'id';
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

    assert.strictEqual(session.subject, 'Subject');

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'pending',
      },
    ]);

    expectEvent('PlanInitialized', {
      subject: 'Subject',
      topics: [{ id: 'id', label: 'Topic', status: 'pending' }],
    });
  });

  void it('changes the subject', () => {
    session.setSubject('Subject');

    assert.strictEqual(session.subject, 'Subject');

    expectEvent('SubjectChanged', {
      subject: 'Subject',
    });
  });

  void it('adds a topic', () => {
    session.addTopic({ label: 'Topic' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'pending',
      },
    ]);

    expectEvent('TopicAdded', {
      topic: { id: 'id', label: 'Topic', status: 'pending' },
    });
  });

  void it('removes a topic', () => {
    session.addTopic({ label: 'Topic' });
    session.removeTopic('id');

    assert.deepStrictEqual(session.topics, []);

    expectEvent('TopicRemoved', {
      topicId: 'id',
    });
  });

  void it("changes a topic's label", () => {
    session.addTopic({ label: 'Initial' });
    session.updateTopic('id', { label: 'Changed' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Changed',
        status: 'pending',
      },
    ]);

    expectEvent('TopicLabelChanged', {
      topicId: 'id',
      label: 'Changed',
    });
  });

  void it("changes a topic's status", () => {
    session.addTopic({ label: 'Topic' });
    session.updateTopic('id', { status: 'in_progress' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'in_progress',
      },
    ]);

    expectEvent('TopicStatusChanged', {
      topicId: 'id',
      status: 'in_progress',
    });
  });

  void it('adds a note', () => {
    session.addNote({ content: 'content' });

    assert.deepStrictEqual(session.notes, [
      {
        id: 'id',
        content: 'content',
      },
    ]);

    expectEvent('NoteAdded', {
      note: {
        id: 'id',
        content: 'content',
      },
    });
  });

  void it('removes a note', () => {
    session.addNote({ content: 'content' });
    session.removeNote('id');

    assert.deepStrictEqual(session.notes, []);

    expectEvent('NoteRemoved', {
      noteId: 'id',
    });
  });

  void it("changes a note's content", () => {
    session.addNote({ content: 'initial' });
    session.updateNote('id', { content: 'updated' });

    assert.deepStrictEqual(session.notes, [
      {
        id: 'id',
        content: 'updated',
      },
    ]);

    expectEvent('NoteContentChanged', {
      noteId: 'id',
      content: 'updated',
    });
  });

  void it('starts and clears the timer', () => {
    session.startTimer(60);

    assert(session.timer);
    assert.strictEqual(session.timer.duration, 60);
    assert.strictEqual(session.timer.startedAt, clock.date.toISOString());

    expectEvent('TimerStarted', {
      duration: 60,
    });

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
    assert.strictEqual(session.timer.pausedAt, clock.date.toISOString());

    expectEvent('TimerPaused', {});

    clock.advance({ minutes: 5 });
    session.resumeTimer();

    assert(session.timer);
    assert.strictEqual(session.timer.startedAt, sub(clock.date, { minutes: 5 }).toISOString());
    assert.strictEqual(session.timer.pausedAt, undefined);

    expectEvent('TimerResumed', {});
  });

  void it('adds a message', () => {
    session.addMessage('user', 'content');

    assert.deepStrictEqual(session.messages, [
      {
        id: 'id',
        date: clock.date.toISOString(),
        role: 'user',
        content: 'content',
      },
    ]);

    expectEvent('MessageAdded', {
      message: {
        id: 'id',
        date: clock.date.toISOString(),
        role: 'user',
        content: 'content',
      },
    });
  });

  void it('removes empty tool calls', () => {
    session.addMessage('assistant', '', { model: 'model', toolCalls: [] });

    assert.deepStrictEqual(session.messages, [
      {
        id: 'id',
        date: clock.date.toISOString(),
        role: 'assistant',
        model: 'model',
        content: '',
      },
    ]);
  });

  void it('fails to add an assistant message without a model', () => {
    assert.throws(() => {
      session.addMessage('assistant', '', {});
    });
  });
});
