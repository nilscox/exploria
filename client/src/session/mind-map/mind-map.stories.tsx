import type { Meta } from '@storybook/react-vite';
import { useState } from 'react';

import type { Node as MindMapNode } from './mind-map';
import { MindMap, type Edge } from './mind-map';

export default {
  title: 'MindMap',
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="h-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

type Node = { label: string; children?: Node[] };

const { nodes, edges } = flatten({
  label: "Adoption de l'IA par l'équipe tech",

  children: [
    {
      label: "Cas d'usage",
      children: [
        { label: 'Génération de code', children: [{ label: 'Complétion inline' }, { label: 'Revue de code' }] },
        { label: 'Documentation' },
        { label: 'Tests automatisés' },
      ],
    },

    {
      label: 'Formation',
      children: [
        { label: 'Ateliers pratiques' },
        {
          label: 'Techniques de prompting',
          children: [{ label: 'Bibliothèque de prompts' }],
        },
      ],
    },

    {
      label: 'Outils',
      children: [{ label: 'GitHub Copilot' }, { label: 'Claude Code' }, { label: 'Assistants conversationnels' }],
    },

    {
      label: 'Risques & gouvernance',
      children: [
        { label: 'Confidentialité des données', children: [{ label: 'Données clients' }] },
        { label: 'Hallucinations & qualité' },
      ],
    },

    {
      label: "Mesure d'impact",
      children: [{ label: 'Vélocité de livraison' }, { label: 'Satisfaction des devs' }],
    },
  ],
});

export const mindMap = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return <MindMap selectedNode={selectedNode} onNodeSelected={setSelectedNode} nodes={nodes} edges={edges} />;
};

function flatten(root: Node) {
  const nodes: MindMapNode[] = [];
  const edges: Edge[] = [];
  const ids = new Map<Node, string>();

  const dfs = (node: Node): void => {
    const id = Math.random().toString(36).slice(-6);

    ids.set(node, id);
    nodes.push({ id, data: { label: node.label } });

    for (const child of node.children ?? []) {
      dfs(child);
      edges.push({ id: Math.random().toString(36).slice(-6), source: ids.get(node)!, target: ids.get(child)! });
    }
  };

  dfs(root);

  return {
    nodes,
    edges,
  };
}
