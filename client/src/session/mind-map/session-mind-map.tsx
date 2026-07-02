import type { Shared } from '@exploria/server/shared';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';

import { MindMap, type Edge, type Node } from './mind-map';

export function SessionMindMap({ session, className }: { session: Shared.Session; className?: string }) {
  const { t } = useLingui();

  const rootLabel = session.subject || t`Subject to be defined`;

  const { nodes, edges } = useMemo(() => {
    return toGraph(session.mindmap, rootLabel);
  }, [session.mindmap, rootLabel]);

  return <MindMap nodes={nodes} edges={edges} className={className} />;
}

function toGraph(mindmap: Shared.Mindmap, rootLabel: string): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [{ id: 'root', data: { label: rootLabel } }];
  const edges: Edge[] = [];

  for (const node of mindmap.nodes) {
    nodes.push({ id: node.id, data: { label: node.label } });
    edges.push({ id: node.id, source: node.parentId ?? 'root', target: node.id });
  }

  return { nodes, edges };
}
