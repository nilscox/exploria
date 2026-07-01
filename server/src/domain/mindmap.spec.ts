import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Mindmap, type MindmapEdge, type MindmapNode } from './mindmap.ts';

void describe('Mindmap', () => {
  const node = (id: string, label = id): MindmapNode => ({ id, label });
  const edge = (id: string, source: string, target: string): MindmapEdge => ({ id, source, target });

  void it('starts empty', () => {
    const mindmap = Mindmap.empty();

    assert.deepStrictEqual(mindmap.nodes, []);
    assert.deepStrictEqual(mindmap.edges, []);
  });

  void describe('queries', () => {
    const mindmap = new Mindmap([node('a'), node('b')], [edge('e1', 'a', 'b')]);

    void it('finds a node by id', () => {
      assert.strictEqual(mindmap.hasNode('a'), true);
      assert.strictEqual(mindmap.hasNode('z'), false);
    });

    void it('finds the edge of an oriented pair', () => {
      assert.deepStrictEqual(mindmap.edgeBetween('a', 'b'), edge('e1', 'a', 'b'));
      assert.strictEqual(mindmap.edgeBetween('b', 'a'), undefined);
    });

    void it('lists edges connected to a node', () => {
      const mindmap = new Mindmap(
        [node('a'), node('b'), node('c')],
        [edge('e1', 'a', 'b'), edge('e2', 'c', 'a'), edge('e3', 'b', 'c')],
      );

      assert.deepStrictEqual(mindmap.edgesConnectedTo('a'), [edge('e1', 'a', 'b'), edge('e2', 'c', 'a')]);
    });

    void it('finds the incoming (parent) edge of a node', () => {
      assert.deepStrictEqual(mindmap.parentEdgeOf('b'), edge('e1', 'a', 'b'));
      assert.strictEqual(mindmap.parentEdgeOf('a'), undefined);
    });

    void it('walks up the parent chain to detect ancestors', () => {
      const mindmap = new Mindmap([node('a'), node('b'), node('c')], [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]);

      assert.strictEqual(mindmap.isAncestor('a', 'c'), true);
      assert.strictEqual(mindmap.isAncestor('c', 'a'), false);
    });
  });

  void describe('transforms', () => {
    void it('adds a node without mutating the source', () => {
      const before = Mindmap.empty();
      const after = before.withNode(node('a'));

      assert.deepStrictEqual(before.nodes, []);
      assert.deepStrictEqual(after.nodes, [node('a')]);
    });

    void it('renames a node', () => {
      const mindmap = new Mindmap([node('a', 'old'), node('b')]).withNodeLabel('a', 'new');

      assert.deepStrictEqual(mindmap.nodes, [node('a', 'new'), node('b')]);
    });

    void it('removes a node without touching edges', () => {
      const mindmap = new Mindmap([node('a'), node('b')], [edge('e1', 'a', 'b')]).withoutNode('a');

      assert.deepStrictEqual(mindmap.nodes, [node('b')]);
      assert.deepStrictEqual(mindmap.edges, [edge('e1', 'a', 'b')]);
    });

    void it('adds and removes edges', () => {
      const mindmap = new Mindmap([node('a'), node('b')]).withEdge(edge('e1', 'a', 'b'));

      assert.deepStrictEqual(mindmap.edges, [edge('e1', 'a', 'b')]);
      assert.deepStrictEqual(mindmap.withoutEdge('e1').edges, []);
    });
  });
});
