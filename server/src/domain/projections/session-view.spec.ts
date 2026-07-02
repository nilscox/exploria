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

  void it('derives topics from the top-level mind map nodes', () => {
    const topicAId = session.addNode({ label: 'Topic A' });
    const topicBId = session.addNode({ label: 'Topic B' });

    session.addNode({ label: 'Sub', parentId: topicAId });
    session.updateNode(topicAId, { status: 'in_progress' });
    session.removeNode(topicBId);

    assert.deepStrictEqual(view().topics, [{ id: topicAId, label: 'Topic A', status: 'in_progress' }]);
  });

  void it('reconstructs the mind map nodes', () => {
    const parentId = session.addNode({ label: 'Parent' });
    const childId = session.addNode({ label: 'Child', parentId });

    assert.deepStrictEqual(view().mindmap.nodes, [
      { id: parentId, parentId: null, label: 'Parent', status: 'pending' },
      { id: childId, parentId, label: 'Child' },
    ]);
  });

  void it('reconstructs notes with their attachment', () => {
    const nodeId = session.addNode({ label: 'Node' });

    session.addNote({ content: 'Note A', parentId: nodeId });

    const { id: noteId } = session.notes[0]!;

    session.updateNote(noteId, { content: 'Note A updated' });

    assert.deepStrictEqual(view().notes, [{ id: noteId, content: 'Note A updated', parentId: nodeId }]);
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
    session.addNode({ label: 'Node' });
    session.startTimer(60);
    session.addMessage('assistant', 'Hi', { model: 'model', toolCalls: [] });

    assert.deepStrictEqual(timeline(), [
      { kind: 'message', date, role: 'user', content: 'Hello', toolCalls: undefined },
      { kind: 'node-added', label: 'Node' },
      { kind: 'timer-started', duration: 60 },
      { kind: 'message', date, role: 'assistant', content: 'Hi', toolCalls: undefined },
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

  void it('emits node-removed with the node label', () => {
    const nodeId = session.addNode({ label: 'Node A' });
    session.removeNode(nodeId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'node-added', label: 'Node A' },
      { kind: 'node-removed', label: 'Node A' },
    ]);
  });

  void it('emits node-label-changed with old and new labels', () => {
    const nodeId = session.addNode({ label: 'Old label' });
    session.updateNode(nodeId, { label: 'New label' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'node-added', label: 'Old label' },
      { kind: 'node-label-changed', oldLabel: 'Old label', newLabel: 'New label' },
    ]);
  });

  void it('emits node-status-changed with node label and new status', () => {
    const nodeId = session.addNode({ label: 'Node A' });
    session.updateNode(nodeId, { status: 'in_progress' });

    assert.deepStrictEqual(timeline(), [
      { kind: 'node-added', label: 'Node A' },
      { kind: 'node-status-changed', label: 'Node A', status: 'in_progress' },
    ]);
  });

  void it('emits node-moved with the node label', () => {
    const nodeId = session.addNode({ label: 'Node A' });
    const parentId = session.addNode({ label: 'Parent' });
    session.moveNode(nodeId, parentId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'node-added', label: 'Node A' },
      { kind: 'node-added', label: 'Parent' },
      { kind: 'node-moved', label: 'Node A' },
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

  void it('emits note-moved with the note content', () => {
    const nodeId = session.addNode({ label: 'Node' });
    session.addNote({ content: 'My note' });
    const noteId = session.notes[0]!.id;
    session.moveNote(noteId, nodeId);

    assert.deepStrictEqual(timeline(), [
      { kind: 'node-added', label: 'Node' },
      { kind: 'note-added', content: 'My note' },
      { kind: 'note-moved', content: 'My note' },
    ]);
  });

  void it("attaches discussion paths to the assistant's message", () => {
    session.setDiscussionPaths([{ label: 'Path A' }, { label: 'Path B', description: 'desc' }]);
    session.addMessage('assistant', 'Which path?', { model: 'model', toolCalls: [] });

    const [pathA, pathB] = session.discussionPaths;

    assert.deepStrictEqual(timeline(), [
      {
        kind: 'message',
        date: clock.date.toISOString(),
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
