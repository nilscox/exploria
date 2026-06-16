import type { GetSessionEvent, SessionEvent } from '@exploria/shared';
import { sub } from 'date-fns';
import assert, { AssertionError } from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { di, StubDateAdapter } from './di';
import { Session } from './session';

void describe('Session', () => {
  let session: Session;
  let stubDate: StubDateAdapter;

  beforeEach(() => {
    stubDate = new StubDateAdapter();
    di.bind('date', stubDate);

    session = new Session('sessionId');
  });

  const expectEvent = <Type extends SessionEvent['type']>(
    type: Type,
    expected: Omit<GetSessionEvent<Type>, 'id' | 'entityId' | 'type' | 'date'>,
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
    session.initializePlan('Subject', [{ id: 'id', label: 'Topic' }]);

    assert.strictEqual(session.subject, 'Subject');

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'pending',
      },
    ]);

    expectEvent('planInitialized', {
      subject: 'Subject',
      topics: [{ id: 'id', label: 'Topic', status: 'pending' }],
    });
  });

  void it('changes the subject', () => {
    session.setSubject('Subject');

    assert.strictEqual(session.subject, 'Subject');

    expectEvent('subjectChanged', {
      subject: 'Subject',
    });
  });

  void it('adds a topic', () => {
    session.addTopic({ id: 'id', label: 'Topic' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'pending',
      },
    ]);

    expectEvent('topicAdded', {
      topic: { id: 'id', label: 'Topic', status: 'pending' },
    });
  });

  void it('removes a topic', () => {
    session.addTopic({ id: 'id', label: 'Topic' });
    session.removeTopic('id');

    assert.deepStrictEqual(session.topics, []);

    expectEvent('topicRemoved', {
      topicId: 'id',
    });
  });

  void it("changes a topic's label", () => {
    session.addTopic({ id: 'id', label: 'Initial' });
    session.updateTopic('id', { label: 'Changed' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Changed',
        status: 'pending',
      },
    ]);

    expectEvent('topicLabelChanged', {
      topicId: 'id',
      label: 'Changed',
    });
  });

  void it("changes a topic's status", () => {
    session.addTopic({ id: 'id', label: 'Topic' });
    session.updateTopic('id', { status: 'in_progress' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'in_progress',
      },
    ]);

    expectEvent('topicStatusChanged', {
      topicId: 'id',
      status: 'in_progress',
    });
  });

  void it('adds a note', () => {
    session.addNote({ id: 'id', content: 'content' });

    assert.deepStrictEqual(session.notes, [
      {
        id: 'id',
        content: 'content',
      },
    ]);

    expectEvent('noteAdded', {
      note: {
        id: 'id',
        content: 'content',
      },
    });
  });

  void it('removes a note', () => {
    session.addNote({ id: 'id', content: 'content' });
    session.removeNote('id');

    assert.deepStrictEqual(session.notes, []);

    expectEvent('noteRemoved', {
      noteId: 'id',
    });
  });

  void it("changes a note's content", () => {
    session.addNote({ id: 'id', content: 'initial' });
    session.updateNote('id', { content: 'updated' });

    assert.deepStrictEqual(session.notes, [
      {
        id: 'id',
        content: 'updated',
      },
    ]);

    expectEvent('noteContentChanged', {
      noteId: 'id',
      content: 'updated',
    });
  });

  void it('starts and clears the timer', () => {
    session.startTimer(60);

    assert(session.timer);
    assert.strictEqual(session.timer.duration, 60);
    assert.strictEqual(session.timer.startedAt, stubDate.date.toISOString());

    expectEvent('timerStarted', {
      duration: 60,
    });

    session.clearTimer();
    assert(session.timer === null);

    expectEvent('timerCleared', {});
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

    stubDate.advance({ minutes: 5 });
    session.pauseTimer();

    assert(session.timer);
    assert.strictEqual(session.timer.pausedAt, stubDate.date.toISOString());

    expectEvent('timerPaused', {});

    stubDate.advance({ minutes: 5 });
    session.resumeTimer();

    assert(session.timer);
    assert.strictEqual(session.timer.startedAt, sub(stubDate.date, { minutes: 5 }).toISOString());
    assert.strictEqual(session.timer.pausedAt, undefined);

    expectEvent('timerResumed', {});
  });

  void it('adds a message', () => {
    const date = new Date(0).toISOString();

    session.addMessage({ id: 'id', date, role: 'user', content: 'content' });

    assert.deepStrictEqual(session.messages, [
      {
        id: 'id',
        date,
        role: 'user',
        content: 'content',
      },
    ]);

    expectEvent('messageAdded', {
      message: {
        id: 'id',
        date,
        role: 'user',
        content: 'content',
      },
    });
  });

  void it('removes empty tool calls', () => {
    const date = new Date(0).toISOString();

    session.addMessage({ id: 'id', date, role: 'assistant', content: '', toolCalls: [] });

    assert.deepStrictEqual(session.messages, [
      {
        id: 'id',
        date,
        role: 'assistant',
        content: '',
      },
    ]);
  });
});
