import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { Session } from './session';

import type { SessionEvent } from '../shared';

void describe('Session', () => {
  let session: Session;
  let events: SessionEvent[];

  const listener = (event: SessionEvent) => events.push(event);

  const date = new Date('2020-01-01T00:00:00.000Z');

  beforeEach(() => {
    session = new Session(() => date);
    events = [];
  });

  void it('initializes a plan', () => {
    session.addListener('planInitialized', listener);

    session.initializePlan('Subject', [{ id: 'id', label: 'Topic' }]);

    assert.strictEqual(session.subject, 'Subject');

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'pending',
      },
    ]);

    assert.deepStrictEqual(events, [
      {
        type: 'planInitialized',
        date,
        subject: 'Subject',
        topics: [{ id: 'id', label: 'Topic', status: 'pending' }],
      },
    ]);
  });

  void it('changes the subject', () => {
    session.addListener('subjectChanged', listener);

    session.subject = 'Subject';

    assert.strictEqual(session.subject, 'Subject');

    assert.deepStrictEqual(events, [
      {
        type: 'subjectChanged',
        date,
        subject: 'Subject',
      },
    ]);
  });

  void it('adds a topic', () => {
    session.addListener('topicAdded', listener);

    session.addTopic({ id: 'id', label: 'Topic' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'pending',
      },
    ]);

    assert.deepStrictEqual(events, [
      {
        type: 'topicAdded',
        date,
        topic: { id: 'id', label: 'Topic', status: 'pending' },
      },
    ]);
  });

  void it('removes a topic', () => {
    session.addListener('topicRemoved', listener);

    session.addTopic({ id: 'id', label: 'Topic' });
    session.removeTopic('id');

    assert.deepStrictEqual(session.topics, []);

    assert.deepStrictEqual(events, [
      {
        type: 'topicRemoved',
        date,
        id: 'id',
      },
    ]);
  });

  void it("changes a topic's label", () => {
    session.addListener('topicLabelChanged', listener);

    session.addTopic({ id: 'id', label: 'Initial' });
    session.updateTopic('id', { label: 'Changed' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Changed',
        status: 'pending',
      },
    ]);

    assert.deepStrictEqual(events, [
      {
        type: 'topicLabelChanged',
        date,
        id: 'id',
        label: 'Changed',
      },
    ]);
  });

  void it("changes a topic's status", () => {
    session.addListener('topicStatusChanged', listener);

    session.addTopic({ id: 'id', label: 'Topic' });
    session.updateTopic('id', { status: 'in_progress' });

    assert.deepStrictEqual(session.topics, [
      {
        id: 'id',
        label: 'Topic',
        status: 'in_progress',
      },
    ]);

    assert.deepStrictEqual(events, [
      {
        type: 'topicStatusChanged',
        date,
        id: 'id',
        status: 'in_progress',
      },
    ]);
  });

  void it('adds a note', () => {
    session.addListener('noteAdded', listener);

    session.addNote({ id: 'id', content: 'content' });

    assert.deepStrictEqual(session.notes, [
      {
        id: 'id',
        content: 'content',
      },
    ]);

    assert.deepStrictEqual(events, [
      {
        type: 'noteAdded',
        date,
        note: {
          id: 'id',
          content: 'content',
        },
      },
    ]);
  });

  void it('removes a note', () => {
    session.addListener('noteRemoved', listener);

    session.addNote({ id: 'id', content: 'content' });
    session.removeNote('id');

    assert.deepStrictEqual(session.notes, []);

    assert.deepStrictEqual(events, [
      {
        type: 'noteRemoved',
        date,
        id: 'id',
      },
    ]);
  });

  void it("changes a note's content", () => {
    session.addListener('noteContentChanged', listener);

    session.addNote({ id: 'id', content: 'initial' });
    session.updateNote('id', { content: 'updated' });

    assert.deepStrictEqual(session.notes, [
      {
        id: 'id',
        content: 'updated',
      },
    ]);

    assert.deepStrictEqual(events, [
      {
        type: 'noteContentChanged',
        date,
        id: 'id',
        content: 'updated',
      },
    ]);
  });

  void it('starts the timer', () => {
    session.addListener('timerStarted', listener);

    session.startTimer();

    assert.strictEqual(session.timerStartDate, date);

    assert.deepStrictEqual(events, [
      {
        type: 'timerStarted',
        date,
      },
    ]);
  });

  void it('adds a message', () => {
    session.addListener('messageAdded', listener);

    session.addMessage({ id: 'id', role: 'user', content: 'content' });

    assert.deepStrictEqual(session.messages, [
      {
        id: 'id',
        role: 'user',
        content: 'content',
      },
    ]);

    assert.deepStrictEqual(events, [
      {
        type: 'messageAdded',
        date,
        message: {
          id: 'id',
          role: 'user',
          content: 'content',
        },
      },
    ]);
  });

  void it('removes empty tool calls', () => {
    session.addMessage({ id: 'id', role: 'assistant', content: '', toolCalls: [] });

    assert.deepStrictEqual(session.messages, [
      {
        id: 'id',
        role: 'assistant',
        content: '',
      },
    ]);
  });

  void it('saves all events', () => {
    session.addNote({ id: 'id', content: 'content' });

    assert.deepStrictEqual(session.events, [
      {
        type: 'noteAdded',
        date,
        note: {
          id: 'id',
          content: 'content',
        },
      },
    ]);
  });
});
