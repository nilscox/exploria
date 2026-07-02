import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Mindmap, type MindmapNode } from './mindmap.ts';

function node(id: string, parentId: string | null, label = id): MindmapNode {
  return { id, parentId, label };
}

void describe('Mindmap', () => {
  //   root (implicit)
  //   ├─ a
  //   │  ├─ a1
  //   │  └─ a2
  //   └─ b
  const nodes = [node('a', null), node('a1', 'a'), node('a2', 'a'), node('b', null)];
  const mindmap = new Mindmap(nodes);

  void it('tells whether a node exists', () => {
    assert.strictEqual(mindmap.has('a1'), true);
    assert.strictEqual(mindmap.has('missing'), false);
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
});
