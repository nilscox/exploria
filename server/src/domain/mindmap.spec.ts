import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Mindmap, type MindmapNode } from './mindmap.ts';

import type { Note } from './session.ts';

function node(id: string, parentId: string | null, label = id): MindmapNode {
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
  const nodes = [node('a', null), node('a1', 'a'), node('a2', 'a'), node('b', null)];
  const mindmap = new Mindmap({ nodes });

  void it('tells whether a node exists', () => {
    assert.strictEqual(mindmap.hasNode('a1'), true);
    assert.strictEqual(mindmap.hasNode('missing'), false);
  });

  void it('lists the children of a node', () => {
    assert.deepStrictEqual(
      mindmap.children('a').map((node) => node.id),
      ['a1', 'a2'],
    );
  });

  void it('lists the topics as the top-level nodes', () => {
    assert.deepStrictEqual(
      mindmap.topics().map((node) => node.id),
      ['a', 'b'],
    );
  });

  void it('returns a subtree with descendants deepest-first and the node last', () => {
    assert.deepStrictEqual(
      mindmap.subtree('a').map((node) => node.id),
      ['a1', 'a2', 'a'],
    );
  });

  void it('returns an empty subtree for a missing node', () => {
    assert.deepStrictEqual(mindmap.subtree('missing'), []);
  });

  void it('detects ancestor relationships', () => {
    assert.strictEqual(mindmap.isDescendant('a1', 'a'), true);
    assert.strictEqual(mindmap.isDescendant('a1', 'b'), false);
    assert.strictEqual(mindmap.isDescendant('a', 'a1'), false);
  });

  void it('lists the notes attached to a node', () => {
    const withNotes = new Mindmap({ nodes, notes: [note('n1', 'a'), note('n2', null), note('n3', 'a')] });

    assert.deepStrictEqual(
      withNotes.notesOf('a').map((note) => note.id),
      ['n1', 'n3'],
    );
  });

  void describe('folds', () => {
    void it('applies an event without mutating the source', () => {
      const before = new Mindmap({ subject: 'Subject', nodes: [node('a', null)] });
      const after = before.apply({
        aggregateType: 'Session',
        aggregateId: 's',
        occurredAt: new Date(),
        type: 'MindmapNodeLabelChanged',
        nodeId: 'a',
        label: 'Renamed',
      });

      assert.notStrictEqual(after, before);
      assert.strictEqual(before.get('a')!.label, 'a');
      assert.strictEqual(after.get('a')!.label, 'Renamed');
    });

    void it('clears the status when a node is nested and restores it when promoted', () => {
      const base = new Mindmap({
        nodes: [{ id: 'a', parentId: null, label: 'a', status: 'in_progress' }, node('b', null)],
      });

      const nested = base.withNodeMoved('a', 'b');
      assert.strictEqual(nested.get('a')!.status, undefined);

      const promoted = nested.withNodeMoved('a', null);
      assert.strictEqual(promoted.get('a')!.status, 'pending');
    });

    void it('keeps a summary across a move', () => {
      const base = new Mindmap({
        nodes: [{ id: 'a', parentId: null, label: 'a', summary: 'kept' }, node('b', null)],
      });

      assert.strictEqual(base.withNodeMoved('a', 'b').get('a')!.summary, 'kept');
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
