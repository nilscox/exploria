import type { Shared } from '@exploria/server/shared';
import { type Edge, type Node, Position } from '@xyflow/react';
import dagre from 'dagre';
import { useMemo } from 'react';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 44;

export type MindmapNodeData = { label: string };
export type MindmapFlowNode = Node<MindmapNodeData, 'mindmap'>;

export function useMindmapLayout(mindmap: Shared.Mindmap) {
  return useMemo(() => layout(mindmap), [mindmap]);
}

function layout({ nodes, edges }: Shared.Mindmap): { nodes: MindmapFlowNode[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();

  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 72 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const flowNodes: MindmapFlowNode[] = nodes.map((node) => {
    const { x, y } = graph.node(node.id);

    return {
      id: node.id,
      type: 'mindmap',
      data: { label: node.label },
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const flowEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));

  return { nodes: flowNodes, edges: flowEdges };
}
