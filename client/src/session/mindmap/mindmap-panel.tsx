import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMutation } from '@tanstack/react-query';
import {
  Background,
  type Connection,
  Controls,
  type Edge,
  Handle,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { createContext, use, useEffect, useRef, useState } from 'react';

import '@xyflow/react/dist/style.css';

import { options } from 'src/api';
import { Button } from 'src/components/button';
import { Input } from 'src/components/input';
import { Select, SelectItem } from 'src/components/select';

import { type MindmapFlowNode, useMindmapLayout } from './use-mindmap-layout';

const edgeTypes: Shared.MindmapEdgeType[] = ['elaborates', 'supports', 'opposes', 'relates'];

type MindmapActions = {
  onRename: (nodeId: string, label: string) => void;
};

const MindmapActionsContext = createContext<MindmapActions | null>(null);

const nodeTypes = { mindmap: MindmapNodeView };

export function MindmapPanel({ session }: { session: Shared.Session }) {
  return (
    <ReactFlowProvider>
      <MindmapFlow session={session} />
    </ReactFlowProvider>
  );
}

function MindmapFlow({ session }: { session: Shared.Session }) {
  const layout = useMindmapLayout(session.mindmap);
  const reactFlow = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(layout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const [edgeType, setEdgeType] = useState<Shared.MindmapEdgeType>('relates');

  const { mutate: addNode } = useMutation(options.sessions.addMindmapNode(session.id));
  const { mutate: renameNode } = useMutation(options.sessions.updateMindmapNode(session.id));
  const { mutate: removeNode } = useMutation(options.sessions.removeMindmapNode(session.id));
  const { mutate: connectNodes } = useMutation(options.sessions.connectMindmapNodes(session.id));
  const { mutate: removeEdge } = useMutation(options.sessions.removeMindmapEdge(session.id));

  const nodeIds = layout.nodes.map((node) => node.id).join(',');

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

  useEffect(() => {
    window.requestAnimationFrame(() => reactFlow.fitView({ duration: 200 }));
  }, [nodeIds, reactFlow]);

  const onConnect = (connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      connectNodes({ source: connection.source, target: connection.target, type: edgeType });
    }
  };

  const onNodesDelete = (deleted: MindmapFlowNode[]) => {
    deleted.forEach((node) => removeNode(node.id));
  };

  const onEdgesDelete = (deleted: Edge[]) => {
    deleted.forEach((edge) => removeEdge(edge.id));
  };

  return (
    <MindmapActionsContext.Provider value={{ onRename: (nodeId, label) => renameNode({ nodeId, label }) }}>
      <div className="relative h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>

        {session.mindmap.nodes.length === 0 && (
          <div className="text-dim pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-sm">
            <Trans>The mindmap is empty. It fills in as the reflection takes shape.</Trans>
          </div>
        )}

        <MindmapToolbar edgeType={edgeType} onEdgeTypeChange={setEdgeType} onAddNode={(label) => addNode({ label })} />
      </div>
    </MindmapActionsContext.Provider>
  );
}

function MindmapToolbar({
  edgeType,
  onEdgeTypeChange,
  onAddNode,
}: {
  edgeType: Shared.MindmapEdgeType;
  onEdgeTypeChange: (type: Shared.MindmapEdgeType) => void;
  onAddNode: (label: string) => void;
}) {
  const { t } = useLingui();
  const [value, setValue] = useState('');

  const handleSubmit: React.SubmitEventHandler = (event) => {
    event.preventDefault();

    if (value.trim() !== '') {
      onAddNode(value.trim());
      setValue('');
    }
  };

  return (
    <div className="row bg-neutral/90 absolute top-2 left-2 z-10 items-stretch gap-1 rounded-md border p-1 backdrop-blur">
      <form onSubmit={handleSubmit} className="row items-stretch gap-1">
        <Input
          name="label"
          aria-label={t`Add node`}
          placeholder={t`Add a node...`}
          value={value}
          autoComplete="off"
          onChange={(event) => setValue(event.target.value)}
          className="h-9 w-40 text-sm"
        />
        <Button type="submit" variant="outlined" size="icon" disabled={value.trim() === ''}>
          +
        </Button>
      </form>

      <Select<Shared.MindmapEdgeType>
        value={edgeType}
        onValueChange={(type) => {
          if (type) {
            onEdgeTypeChange(type);
          }
        }}
      >
        {edgeTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}

function MindmapNodeView({ id, data }: NodeProps<MindmapFlowNode>) {
  const actions = use(MindmapActionsContext);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const label = inputRef.current?.value.trim();

    if (label && label !== data.label) {
      actions?.onRename(id, label);
    }

    setEditing(false);
  };

  return (
    <div
      className="bg-neutral row max-w-52 min-w-40 items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium shadow-sm"
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top} />

      {editing ? (
        <input
          ref={inputRef}
          defaultValue={data.label}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit();
            }
            if (event.key === 'Escape') {
              setEditing(false);
            }
          }}
          className="w-full bg-transparent text-center outline-none"
        />
      ) : (
        <span className="line-clamp-3">{data.label}</span>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
