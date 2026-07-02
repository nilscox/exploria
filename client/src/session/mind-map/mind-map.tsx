import {
  Background,
  ConnectionMode,
  Controls,
  type Edge as FlowEdge,
  type Node as FlowNode,
  Handle,
  type NodeMouseHandler,
  type NodeProps,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useMemo, useState } from 'react';

import '@xyflow/react/dist/style.css';

import {
  type Branches,
  type Edge,
  type Node,
  type NodeVariant,
  type Side,
  type Size,
  computeBranches,
  layoutMindMap,
} from './mind-map-layout';

export type { Edge, Node } from './mind-map-layout';

const nodeTypes = { mindMap: MindMapNode } satisfies NodeTypes;

function edgeStyle(color: string | undefined): React.CSSProperties {
  return { stroke: color ?? 'var(--color-border)', strokeWidth: 2 };
}

function edgeHandles(side: Side | undefined): { sourceHandle: Side; targetHandle: Side } {
  return side === 'left'
    ? { sourceHandle: 'left', targetHandle: 'right' }
    : { sourceHandle: 'right', targetHandle: 'left' };
}

type MindMapProps = {
  nodes: Node[];
  edges: Edge[];
  selectedNode?: string | null;
  onNodeSelected?: (id: string | null) => void;
  className?: string;
};

export function MindMap(props: MindMapProps) {
  return (
    <ReactFlowProvider>
      <MindMapFlow {...props} />
    </ReactFlowProvider>
  );
}

function MindMapFlow({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNode,
  onNodeSelected,
  className,
}: MindMapProps) {
  const branches = useMemo(() => computeBranches(initialNodes, initialEdges), [initialNodes, initialEdges]);

  const [nodes, setNodes] = useState<FlowNode<MindMapNodeData>[]>(() => buildNodes(initialNodes, branches));
  const [edges, setEdges] = useState<FlowEdge[]>(() => buildEdges(initialEdges, branches));
  const [laidOut, setLaidOut] = useState(false);

  const { getNodes, fitView } = useReactFlow<FlowNode<MindMapNodeData>>();

  const sizeSignature = useStore((state) => {
    let signature = '';

    for (const node of state.nodeLookup.values()) {
      signature += `${node.id}:${node.measured?.width ?? 0}x${node.measured?.height ?? 0};`;
    }

    return signature;
  });

  useEffect(() => {
    setNodes(buildNodes(initialNodes, branches));
    setEdges(buildEdges(initialEdges, branches));
    setLaidOut(false);
  }, [initialNodes, initialEdges, branches]);

  useEffect(() => {
    const sizes = new Map<string, Size>();

    for (const node of getNodes()) {
      if (!node.measured?.width || !node.measured?.height) {
        return;
      }

      sizes.set(node.id, { width: node.measured.width, height: node.measured.height });
    }

    if (sizes.size === 0) {
      return;
    }

    if (initialNodes.some((node) => !sizes.has(node.id))) {
      return;
    }

    const positions = layoutMindMap(initialNodes, initialEdges, sizes);

    setNodes((snapshot) => snapshot.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })));
    setLaidOut(true);
  }, [sizeSignature, initialNodes, initialEdges, getNodes]);

  useEffect(() => {
    if (laidOut) {
      void fitView();
    }
  }, [laidOut, sizeSignature, fitView]);

  useEffect(() => {
    setNodes((snapshot) =>
      snapshot.map((node) => ({ ...node, data: { ...node.data, selected: node.id === selectedNode } })),
    );
  }, [selectedNode]);

  const onNodesChange = useCallback<OnNodesChange<FlowNode<MindMapNodeData>>>((changes) => {
    setNodes((snapshot) => applyNodeChanges(changes, snapshot));
  }, []);

  const onNodeClick = useCallback<NodeMouseHandler<FlowNode<MindMapNodeData>>>(
    (_, node) => {
      if (node.data.variant !== 'root') {
        onNodeSelected?.(node.id);
      }
    },
    [onNodeSelected],
  );

  const onPaneClick = useCallback(() => onNodeSelected?.(null), [onNodeSelected]);

  const onEdgesChange = useCallback<OnEdgesChange<FlowEdge>>((changes) => {
    setEdges((snapshot) => applyEdgeChanges(changes, snapshot));
  }, []);

  const onConnect = useCallback<OnConnect>(
    (params) => {
      setEdges((snapshot) => addEdge({ ...params, style: edgeStyle(branches.color.get(params.target)) }, snapshot));
    },
    [branches],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      connectionMode={ConnectionMode.Loose}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodesDraggable={false}
      elementsSelectable={false}
      className={className}
      style={{ opacity: laidOut ? 1 : 0, transition: 'opacity 120ms ease' }}
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

function buildNodes(nodes: Node[], branches: Branches): FlowNode<MindMapNodeData>[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'mindMap',
    position: { x: 0, y: 0 },
    data: {
      label: node.data.label,
      color: branches.color.get(node.id),
      variant: branches.variant.get(node.id) ?? 'internal',
      side: branches.side.get(node.id),
    },
  }));
}

function buildEdges(edges: Edge[], branches: Branches): FlowEdge[] {
  return edges.map((edge) => ({
    ...edge,
    style: edgeStyle(branches.color.get(edge.target)),
    ...edgeHandles(branches.side.get(edge.target)),
  }));
}

type MindMapNodeData = {
  label: string;
  color?: string;
  variant: NodeVariant;
  side?: Side;
  selected?: boolean;
};

function MindMapNode({ data }: NodeProps<FlowNode<MindMapNodeData>>) {
  const { label, color, variant, side, selected } = data;

  const accent = color ?? 'var(--color-primary)';

  return (
    <div
      className={nodeVariants({ variant, selected })}
      style={{
        borderColor: variant === 'root' ? undefined : color,
        boxShadow: selected ? `0 0 0 3px ${accent}, 0 0 32px rgb(0 0 0 / 0.42)` : undefined,
      }}
    >
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className={handleVariants({ dangling: variant === 'leaf' && side === 'left' })}
        style={{ left: -8 }}
      />
      {label}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className={handleVariants({ dangling: variant === 'leaf' && side === 'right' })}
        style={{ right: -8 }}
      />
    </div>
  );
}

const nodeVariants = cva(
  'group relative flex items-center transition-[border-width,box-shadow] duration-100 justify-center rounded-xl px-4 py-2 text-center leading-tight outline-none min-w-20 w-fit max-w-50',
  {
    variants: {
      variant: {
        root: 'border-2 border-transparent bg-primary font-semibold text-primary-foreground',
        internal: 'border-2 bg-background text-sm text-foreground cursor-pointer',
        leaf: 'border-2 bg-background text-sm text-foreground cursor-pointer',
      } satisfies Record<NodeVariant, string>,
      selected: {
        true: '',
        false: 'shadow-sm',
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

const handleVariants = cva('-z-10 size-2! transition-opacity group-hover:opacity-100', {
  variants: {
    dangling: {
      true: 'opacity-0',
      false: 'opacity-40',
    },
  },
});
