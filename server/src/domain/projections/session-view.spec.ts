import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../../adapters/clock';
import { StubGenerator } from '../../adapters/generator';
import { StubUiNotifier } from '../../adapters/logger';
import { Session } from '../session';
import { toSessionView, toTimeline } from './session-view';

void describe('toSessionView', () => {
  let clock: StubClock;
  let session: Session;

  const view = () => toSessionView(session.id, session.peekDomainEvents());

  beforeEach(() => {
    clock = new StubClock();
    session = new Session(new StubGenerator(), clock, new StubUiNotifier());
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
    session = new Session(new StubGenerator(), new StubClock(), new StubUiNotifier());
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

  void it('attaches discussion paths to the preceding message', () => {
    session.addMessage('assistant', 'Which path?', { model: 'model', toolCalls: [] });
    session.setDiscussionPath([{ label: 'Path A' }, { label: 'Path B', description: 'desc' }]);

    const [pathA, pathB] = session.discussionPaths;

    assert.deepStrictEqual(timeline(), [
      {
        kind: 'message',
        role: 'assistant',
        content: 'Which path?',
        toolCalls: undefined,
        paths: [
          { id: pathA!.id, label: 'Path A', selected: false },
          { id: pathB!.id, label: 'Path B', description: 'desc', selected: false },
        ],
      },
    ]);
  });

  void it('keeps paths visible after selection and marks the selected one', () => {
    session.addMessage('assistant', 'Which path?', { model: 'model', toolCalls: [] });
    session.setDiscussionPath([{ label: 'Path A' }, { label: 'Path B' }]);

    const [pathA, pathB] = session.discussionPaths;

    session.selectDiscussionPath(pathA!.id);

    const item = timeline()[0];

    assert(item?.kind === 'message');
    assert.deepStrictEqual(item.paths, [
      { id: pathA!.id, label: 'Path A', selected: true },
      { id: pathB!.id, label: 'Path B', selected: false },
    ]);
  });
});
