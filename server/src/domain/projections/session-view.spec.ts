import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../../adapters/clock';
import { StubGenerator } from '../../adapters/generator';
import { StubUiNotifier } from '../../adapters/logger';
import { Session } from '../session';
import { toSessionView } from './session-view';

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

  void it('clears discussion paths on selection', () => {
    session.addMessage('assistant', 'content', { model: 'model', toolCalls: [] });
    session.setDiscussionPath([{ label: 'Path A' }, { label: 'Path B' }]);

    assert.strictEqual(view().discussionPaths.length, 2);

    const { id: pathId } = view().discussionPaths[0]!;

    session.selectDiscussionPath(pathId);

    assert.deepStrictEqual(view().discussionPaths, []);
  });

  void it('exposes events without the aggregate envelope fields', () => {
    session.setModel('gpt-4o');

    assert.deepStrictEqual(view().events, [{ type: 'ModelChanged', model: 'gpt-4o' }]);
  });
});
