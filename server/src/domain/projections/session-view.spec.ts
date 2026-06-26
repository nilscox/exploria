import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../../adapters/clock';
import { StubGenerator } from '../../adapters/generator';
import { Session } from '../session';
import { toSessionView, toTimeline } from './session-view';

void describe('toSessionView', () => {
  let clock: StubClock;
  let session: Session;

  const view = () => toSessionView(session.id, session.peekDomainEvents());

  beforeEach(() => {
    clock = new StubClock();
    session = new Session(new StubGenerator(), clock);
  });

  void it('reconstructs model and subject', () => {
    session.setModel('gpt-4o');
    session.setSubject('My subject');

    assert.partialDeepStrictEqual(view(), { id: session.id, model: 'gpt-4o', subject: 'My subject' });
  });

  void it('reconstructs topics', () => {
    session.addTopic({ label: 'Topic A' });
    session.addTopic({ label: 'Topic B' });

    const [{ id: topicAId }, { id: topicBId }] = [session.topics[0]!, session.topics[1]!];

    session.updateTopic(topicAId, { status: 'in_progress' });
    session.removeTopic(topicBId);

    assert.deepStrictEqual(view().topics, [{ id: topicAId, label: 'Topic A', status: 'in_progress' }]);
  });

  void it('reconstructs notes', () => {
    session.addNote({ content: 'Note A' });

    const { id: noteId } = session.notes[0]!;

    session.updateNote(noteId, { content: 'Note A updated' });

    assert.deepStrictEqual(view().notes, [{ id: noteId, content: 'Note A updated' }]);
  });

  void it('reconstructs the timer across pause and resume', () => {
    session.startTimer(60);
    clock.advance({ minutes: 5 });
    session.pauseTimer();
    clock.advance({ minutes: 2 });
    session.resumeTimer();

    assert.deepStrictEqual(view().timer, session.timer);
  });
});

void describe('toTimeline', () => {
  let session: Session;

  const timeline = () => toTimeline(session.peekDomainEvents());

  beforeEach(() => {
    session = new Session(new StubGenerator(), new StubClock());
  });

  void it('interleaves messages and activity notifications in order', () => {
    session.addMessage('user', 'Hello');
    session.addTopic({ label: 'Topic' });
    session.startTimer(60);
    session.addMessage('assistant', 'Hi', { model: 'model', toolCalls: [] });

    assert.deepStrictEqual(timeline(), [
      { kind: 'message', role: 'user', content: 'Hello', toolCalls: undefined },
      { kind: 'topic-added', label: 'Topic' },
      { kind: 'timer-started', duration: 60 },
      { kind: 'message', role: 'assistant', content: 'Hi', toolCalls: undefined },
    ]);
  });

  void it('emits subject-changed', () => {
    session.setSubject('New subject');

    assert.deepStrictEqual(timeline(), [{ kind: 'subject-changed', subject: 'New subject' }]);
  });

  void it('emits topic-removed with the topic label', () => {
    session.addTopic({ label: 'Topic A' });
    const topicId = session.topics[0]!.id;
    session.removeTopic(topicId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Topic A' },
      { kind: 'topic-removed', label: 'Topic A' },
    ]);
  });

  void it('emits topic-label-changed with old and new labels', () => {
    session.addTopic({ label: 'Old label' });
    const topicId = session.topics[0]!.id;
    session.updateTopic(topicId, { label: 'New label' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Old label' },
      { kind: 'topic-label-changed', oldLabel: 'Old label', newLabel: 'New label' },
    ]);
  });

  void it('emits topic-status-changed with topic label and new status', () => {
    session.addTopic({ label: 'Topic A' });
    const topicId = session.topics[0]!.id;
    session.updateTopic(topicId, { status: 'in_progress' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Topic A' },
      { kind: 'topic-status-changed', label: 'Topic A', status: 'in_progress' },
    ]);
  });

  void it('emits note-added with note content', () => {
    session.addNote({ content: 'My note' });

    assert.deepStrictEqual(timeline(), [{ kind: 'note-added', content: 'My note' }]);
  });

  void it('emits note-removed with the note content at time of removal', () => {
    session.addNote({ content: 'Initial content' });
    const noteId = session.notes[0]!.id;
    session.updateNote(noteId, { content: 'Updated content' });
    session.removeNote(noteId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'note-added', content: 'Initial content' },
      { kind: 'note-content-changed', content: 'Updated content' },
      { kind: 'note-removed', content: 'Updated content' },
    ]);
  });

  void it('emits note-content-changed with the new content', () => {
    session.addNote({ content: 'Original' });
    const noteId = session.notes[0]!.id;
    session.updateNote(noteId, { content: 'Updated' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'note-added', content: 'Original' },
      { kind: 'note-content-changed', content: 'Updated' },
    ]);
  });

  void it("attaches discussion paths to the assistant's message", () => {
    session.setDiscussionPaths([{ label: 'Path A' }, { label: 'Path B', description: 'desc' }]);
    session.addMessage('assistant', 'Which path?', { model: 'model', toolCalls: [] });

    const [pathA, pathB] = session.discussionPaths;

    assert.deepStrictEqual(timeline(), [
      {
        kind: 'message',
        role: 'assistant',
        content: 'Which path?',
        toolCalls: undefined,
        paths: [
          { id: pathA!.id, label: 'Path A' },
          { id: pathB!.id, label: 'Path B', description: 'desc' },
        ],
      },
    ]);
  });

  void it('keeps paths visible after selection and marks the selected one', () => {
    session.setDiscussionPaths([{ label: 'Path A' }, { label: 'Path B' }]);
    session.addMessage('assistant', 'Which path?', { model: 'model', toolCalls: [] });

    const [pathA, pathB] = session.discussionPaths;

    session.selectDiscussionPath(pathA!.id);

    const item = timeline()[0];

    assert(item?.kind === 'message');
    assert.deepStrictEqual(item.paths, [
      { id: pathA!.id, label: 'Path A', selected: true },
      { id: pathB!.id, label: 'Path B', selected: false },
    ]);
  });

  void it('marks no path as selected when a user message was added', () => {
    session.setDiscussionPaths([{ label: 'Path A' }, { label: 'Path B' }]);
    session.addMessage('assistant', 'Which path?', { model: 'model', toolCalls: [] });

    const [pathA, pathB] = session.discussionPaths;

    session.addMessage('user', 'Something else.');

    const item = timeline()[0];

    assert(item?.kind === 'message');
    assert.deepStrictEqual(item.paths, [
      { id: pathA!.id, label: 'Path A', selected: false },
      { id: pathB!.id, label: 'Path B', selected: false },
    ]);
  });
});
