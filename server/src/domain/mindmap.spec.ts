import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Mindmap, type Topic } from './mindmap.ts';

import type { Note } from './session.ts';

function topic(id: string, parentId: string | null, label = id): Topic {
  return { id, parentId, label };
}

function note(id: string, parentId: string | null): Note {
  return { id, parentId, title: `${id} title`, content: `${id} content` };
}

void describe('Mindmap', () => {
  //   root (implicit)
  //   ├─ a
  //   │  ├─ a1
  //   │  └─ a2
  //   └─ b
  const topics = [topic('a', null), topic('a1', 'a'), topic('a2', 'a'), topic('b', null)];
  const mindmap = new Mindmap({ topics });

  void it('tells whether a topic exists', () => {
    assert.strictEqual(mindmap.hasTopic('a1'), true);
    assert.strictEqual(mindmap.hasTopic('missing'), false);
  });

  void it('lists the children of a topic', () => {
    assert.deepStrictEqual(
      mindmap.children('a').map((topic) => topic.id),
      ['a1', 'a2'],
    );
  });

  void it('lists the top-level topics as the children of the root', () => {
    assert.deepStrictEqual(
      mindmap.children(null).map((topic) => topic.id),
      ['a', 'b'],
    );
  });

  void it('returns a subtree with descendants deepest-first and the topic last', () => {
    assert.deepStrictEqual(
      mindmap.subtree('a').map((topic) => topic.id),
      ['a1', 'a2', 'a'],
    );
  });

  void it('returns an empty subtree for a missing topic', () => {
    assert.deepStrictEqual(mindmap.subtree('missing'), []);
  });

  void it('detects ancestor relationships', () => {
    assert.strictEqual(mindmap.isDescendant('a1', 'a'), true);
    assert.strictEqual(mindmap.isDescendant('a1', 'b'), false);
    assert.strictEqual(mindmap.isDescendant('a', 'a1'), false);
  });

  void it('lists the notes attached to a topic', () => {
    const withNotes = new Mindmap({ topics, notes: [note('n1', 'a'), note('n2', null), note('n3', 'a')] });

    assert.deepStrictEqual(
      withNotes.notesOf('a').map((note) => note.id),
      ['n1', 'n3'],
    );
  });

  void describe('folds', () => {
    void it('applies an event without mutating the source', () => {
      const before = new Mindmap({ subject: 'Subject', topics: [topic('a', null)] });
      const after = before.apply({
        aggregateType: 'Session',
        aggregateId: 's',
        occurredAt: new Date(),
        type: 'TopicLabelChanged',
        topicId: 'a',
        label: 'Renamed',
      });

      assert.notStrictEqual(after, before);
      assert.strictEqual(before.getTopic('a')!.label, 'a');
      assert.strictEqual(after.getTopic('a')!.label, 'Renamed');
    });

    void it('clears the status when a topic is nested and restores it when promoted', () => {
      const base = new Mindmap({
        topics: [{ id: 'a', parentId: null, label: 'a', status: 'in_progress' }, topic('b', null)],
      });

      const nested = base.withTopicMoved('a', 'b');
      assert.strictEqual(nested.getTopic('a')!.status, undefined);

      const promoted = nested.withTopicMoved('a', null);
      assert.strictEqual(promoted.getTopic('a')!.status, 'pending');
    });

    void it('keeps a summary across a move', () => {
      const base = new Mindmap({
        topics: [{ id: 'a', parentId: null, label: 'a', summary: 'kept' }, topic('b', null)],
      });

      assert.strictEqual(base.withTopicMoved('a', 'b').getTopic('a')!.summary, 'kept');
    });

    void it('returns itself for unrelated events', () => {
      const base = new Mindmap({ subject: 'Subject' });
      const after = base.apply({
        aggregateType: 'Session',
        aggregateId: 's',
        occurredAt: new Date(),
        type: 'ModelChanged',
        model: 'gpt-4o',
      });

      assert.strictEqual(after, base);
    });
  });
});
