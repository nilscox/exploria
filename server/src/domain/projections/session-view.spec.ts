import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../../adapters/clock.ts';
import { StubGenerator } from '../../adapters/generator.ts';
import { Session } from '../session.ts';
import { toSessionView, toTimeline } from './session-view.ts';

void describe('toSessionView', () => {
  let clock: StubClock;
  let session: Session;

  const view = () => toSessionView(session.id, session.peekDomainEvents());

  beforeEach(() => {
    clock = new StubClock();
    session = new Session(new StubGenerator(), clock);
  });

  void it('reconstructs ended, model and subject', () => {
    session.setModel('gpt-4o');
    session.setSubject('My subject');
    session.end();

    assert.partialDeepStrictEqual(view(), { id: session.id, ended: true, model: 'gpt-4o', subject: 'My subject' });

    session.reopen();

    assert.partialDeepStrictEqual(view(), { ended: false });
  });

  void it('exposes all topics of the tree with parent, status and summary', () => {
    const topicAId = session.addTopic({ label: 'Topic A' });
    const topicBId = session.addTopic({ label: 'Topic B' });
    const subId = session.addTopic({ label: 'Sub', parentId: topicAId });

    session.updateTopic(topicAId, { status: 'in_progress' });
    session.updateTopic(topicAId, { summary: 'A recap.' });
    session.removeTopic(topicBId);

    assert.deepStrictEqual(view().topics, [
      { id: topicAId, parentId: null, label: 'Topic A', status: 'in_progress', summary: 'A recap.' },
      { id: subId, parentId: topicAId, label: 'Sub' },
    ]);
  });

  void it('reconstructs notes with their attachment', () => {
    const topicId = session.addTopic({ label: 'Topic' });

    session.addNote({ title: 'Note A', content: 'Note A body', parentId: topicId });

    const { id: noteId } = session.notes[0]!;

    session.updateNote(noteId, { content: 'Note A updated' });

    assert.deepStrictEqual(view().notes, [
      { id: noteId, parentId: topicId, title: 'Note A', content: 'Note A updated' },
    ]);
  });

  void it('reconstructs the timer across pause and resume', () => {
    session.startTimer(60);
    clock.advance({ minutes: 5 });
    session.pauseTimer();
    clock.advance({ minutes: 2 });
    session.resumeTimer();

    assert.deepStrictEqual(view().timer, session.timer);
  });

  void it('defaults the posture to automatic', () => {
    assert.strictEqual(view().postureMode, 'auto');
    assert.strictEqual(view().posture, 'socratic');
  });

  void it('reconstructs the forced posture mode', () => {
    session.setPosture('examiner', '', true);

    assert.strictEqual(view().postureMode, 'forced');
    assert.strictEqual(view().posture, 'examiner');
  });

  void it('keeps automatic mode when the assistant changes posture', () => {
    session.setPosture('mirror', 'reason', false);

    assert.strictEqual(view().postureMode, 'auto');
  });

  void it('defaults intensity to balanced and message length to normal', () => {
    assert.strictEqual(view().intensity, 'balanced');
    assert.strictEqual(view().messageLength, 'normal');
  });

  void it('reconstructs intensity and message length', () => {
    session.setIntensity('demanding');
    session.setMessageLength('concise');

    assert.strictEqual(view().intensity, 'demanding');
    assert.strictEqual(view().messageLength, 'concise');
  });
});

void describe('toTimeline', () => {
  let generator: StubGenerator;
  let clock: StubClock;
  let session: Session;

  const timeline = () => toTimeline(session.peekDomainEvents());

  beforeEach(() => {
    generator = new StubGenerator();
    clock = new StubClock();
    session = new Session(generator, clock);
  });

  void it('interleaves messages and activity notifications in order', () => {
    const date = clock.date.toISOString();

    session.addMessage('user', 'Hello');
    session.addTopic({ label: 'Node' });
    session.startTimer(60);
    session.addMessage('assistant', 'Hi', { model: 'model' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'message', date, role: 'user', content: 'Hello' },
      { kind: 'topic-added', label: 'Node' },
      { kind: 'timer-started', duration: 60 },
      { kind: 'message', date, role: 'assistant', content: 'Hi' },
    ]);
  });

  void it('emits tool-call items', () => {
    session.recordToolCall({ id: 'call-1', name: 'setSubject', arguments: { subject: 'Node' } }, 'curator', {
      result: 'OK',
    });
    session.recordToolCall({ id: 'call-2', name: 'webSearch', arguments: { query: 'node' } }, 'facilitator', {
      error: 'boom',
    });

    assert.deepStrictEqual(timeline(), [
      { kind: 'tool-call', name: 'setSubject', arguments: { subject: 'Node' }, actor: 'curator', result: 'OK' },
      { kind: 'tool-call', name: 'webSearch', arguments: { query: 'node' }, actor: 'facilitator', error: 'boom' },
    ]);
  });

  void it('emits session-ended and session-reopened', () => {
    session.end();
    session.reopen();

    assert.deepStrictEqual(timeline(), [{ kind: 'session-ended' }, { kind: 'session-reopened' }]);
  });

  void it('emits subject-changed', () => {
    session.setSubject('New subject');

    assert.deepStrictEqual(timeline(), [{ kind: 'subject-changed', subject: 'New subject' }]);
  });

  void it('emits posture-changed with reason and forced flag', () => {
    session.setPosture('devils_advocate', 'Testing your thesis', false);

    assert.deepStrictEqual(timeline(), [
      { kind: 'posture-changed', posture: 'devils_advocate', reason: 'Testing your thesis', forced: false },
    ]);
  });

  void it('emits intensity-changed', () => {
    session.setIntensity('demanding');

    assert.deepStrictEqual(timeline(), [{ kind: 'intensity-changed', intensity: 'demanding' }]);
  });

  void it('emits message-length-changed', () => {
    session.setMessageLength('concise');

    assert.deepStrictEqual(timeline(), [{ kind: 'message-length-changed', messageLength: 'concise' }]);
  });

  void it('emits node-removed with the node label', () => {
    const nodeId = session.addTopic({ label: 'Node A' });
    session.removeTopic(nodeId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Node A' },
      { kind: 'topic-removed', label: 'Node A' },
    ]);
  });

  void it('emits node-label-changed with old and new labels', () => {
    const nodeId = session.addTopic({ label: 'Old label' });
    session.updateTopic(nodeId, { label: 'New label' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Old label' },
      { kind: 'topic-label-changed', oldLabel: 'Old label', newLabel: 'New label' },
    ]);
  });

  void it('emits node-status-changed with node label and new status', () => {
    const nodeId = session.addTopic({ label: 'Node A' });
    session.updateTopic(nodeId, { status: 'in_progress' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Node A' },
      { kind: 'topic-status-changed', label: 'Node A', status: 'in_progress' },
    ]);
  });

  void it('emits node-moved with the node label', () => {
    const nodeId = session.addTopic({ label: 'Node A' });
    const parentId = session.addTopic({ label: 'Parent' });
    session.moveTopic(nodeId, parentId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Node A' },
      { kind: 'topic-added', label: 'Parent' },
      { kind: 'topic-moved', label: 'Node A' },
    ]);
  });

  void it('emits note-added with the note title', () => {
    session.addNote({ title: 'My note', content: 'body' });

    assert.deepStrictEqual(timeline(), [{ kind: 'note-added', title: 'My note' }]);
  });

  void it('emits note-removed with the note title at time of removal', () => {
    session.addNote({ title: 'Initial title', content: 'body' });
    const noteId = session.notes[0]!.id;
    session.updateNote(noteId, { title: 'Updated title' });
    session.removeNote(noteId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'note-added', title: 'Initial title' },
      { kind: 'note-title-changed', oldTitle: 'Initial title', newTitle: 'Updated title' },
      { kind: 'note-removed', title: 'Updated title' },
    ]);
  });

  void it('emits note-content-changed with the note title', () => {
    session.addNote({ title: 'My note', content: 'Original' });
    const noteId = session.notes[0]!.id;
    session.updateNote(noteId, { content: 'Updated' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'note-added', title: 'My note' },
      { kind: 'note-content-changed', title: 'My note' },
    ]);
  });

  void it('emits note-moved with the note title', () => {
    const nodeId = session.addTopic({ label: 'Node' });
    session.addNote({ title: 'My note', content: 'body' });
    const noteId = session.notes[0]!.id;
    session.moveNote(noteId, nodeId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Node' },
      { kind: 'note-added', title: 'My note' },
      { kind: 'note-moved', title: 'My note' },
    ]);
  });

  void it('emits node-summary-changed with the node label', () => {
    const nodeId = session.addTopic({ label: 'Topic' });
    session.updateTopic(nodeId, { summary: 'A recap.' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'topic-added', label: 'Topic' },
      { kind: 'topic-summary-changed', label: 'Topic' },
    ]);
  });

  const askQuestion = () =>
    session.askQuestions([
      {
        content: 'Which one?',
        options: [
          { label: 'Option A', description: 'a' },
          { label: 'Option B', description: 'b' },
        ],
      },
    ]);

  void it("attaches questions to the assistant's message", () => {
    askQuestion();
    session.addMessage('assistant', 'Pick one', { model: 'model' });

    const question = session.questions[0]!;
    const [optionA, optionB] = question.options;

    assert.deepStrictEqual(timeline(), [
      {
        kind: 'message',
        date: clock.date.toISOString(),
        role: 'assistant',
        content: 'Pick one',
        questions: [
          {
            id: question.id,
            content: 'Which one?',
            options: [
              { id: optionA!.id, label: 'Option A', description: 'a' },
              { id: optionB!.id, label: 'Option B', description: 'b' },
            ],
          },
        ],
      },
    ]);
  });

  void it('keeps options visible after selection and marks the answered one', () => {
    askQuestion();
    session.addMessage('assistant', 'Pick one', { model: 'model' });

    const question = session.questions[0]!;
    const [optionA, optionB] = question.options;

    session.selectAnswer(question.id, optionA!.id);

    const item = timeline()[0];

    assert(item?.kind === 'message');
    assert.deepStrictEqual(item.questions?.[0]?.options, [
      { id: optionA!.id, label: 'Option A', description: 'a', selected: true },
      { id: optionB!.id, label: 'Option B', description: 'b', selected: false },
    ]);
  });

  void it('marks no option as selected when a user message was added', () => {
    askQuestion();
    session.addMessage('assistant', 'Pick one', { model: 'model' });

    const question = session.questions[0]!;
    const [optionA, optionB] = question.options;

    session.addMessage('user', 'Something else.');

    const item = timeline()[0];

    assert(item?.kind === 'message');
    assert.deepStrictEqual(item.questions?.[0]?.options, [
      { id: optionA!.id, label: 'Option A', description: 'a', selected: false },
      { id: optionB!.id, label: 'Option B', description: 'b', selected: false },
    ]);
  });
});
