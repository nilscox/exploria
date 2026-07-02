import type { Shared } from '@exploria/server/shared';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';

import { MindMap, type Edge, type Node } from './mind-map';

export function SessionMindMap({ session, className }: { session: Shared.Session; className?: string }) {
  const { t } = useLingui();

  const rootLabel = session.subject || t`Subject to be defined`;

  const { nodes, edges } = useMemo(() => {
    return toGraph(session.topics, rootLabel);
  }, [session.topics, rootLabel]);

  return <MindMap nodes={nodes} edges={edges} className={className} />;
}

function toGraph(topics: Shared.Topic[], rootLabel: string): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [{ id: 'root', data: { label: rootLabel } }];
  const edges: Edge[] = [];

  for (const topic of topics) {
    nodes.push({ id: topic.id, data: { label: topic.label } });
    edges.push({ id: topic.id, source: topic.parentId ?? 'root', target: topic.id });
  }

  return { nodes, edges };
}
