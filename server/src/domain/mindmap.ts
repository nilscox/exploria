export type MindmapNode = {
  id: string;
  label: string;
};

export type MindmapEdge = {
  id: string;
  source: string;
  target: string;
};

export class Mindmap {
  private readonly _nodes: MindmapNode[];
  private readonly _edges: MindmapEdge[];

  constructor(nodes: MindmapNode[] = [], edges: MindmapEdge[] = []) {
    this._nodes = nodes;
    this._edges = edges;
  }

  static empty(): Mindmap {
    return new Mindmap();
  }

  get nodes(): MindmapNode[] {
    return this._nodes;
  }

  get edges(): MindmapEdge[] {
    return this._edges;
  }

  hasNode(nodeId: string): boolean {
    return this._nodes.some((node) => node.id === nodeId);
  }

  edgeBetween(source: string, target: string): MindmapEdge | undefined {
    return this._edges.find((edge) => edge.source === source && edge.target === target);
  }

  edgesConnectedTo(nodeId: string): MindmapEdge[] {
    return this._edges.filter((edge) => edge.source === nodeId || edge.target === nodeId);
  }

  parentEdgeOf(nodeId: string): MindmapEdge | undefined {
    return this._edges.find((edge) => edge.target === nodeId);
  }

  isAncestor(ancestorId: string, nodeId: string): boolean {
    const seen = new Set<string>();
    let current = this.parentEdgeOf(nodeId)?.source;

    while (current !== undefined && !seen.has(current)) {
      if (current === ancestorId) {
        return true;
      }

      seen.add(current);
      current = this.parentEdgeOf(current)?.source;
    }

    return false;
  }

  withNode(node: MindmapNode): Mindmap {
    return new Mindmap([...this._nodes, node], this._edges);
  }

  withNodeLabel(nodeId: string, label: string): Mindmap {
    return new Mindmap(
      this._nodes.map((node) => (node.id === nodeId ? { ...node, label } : node)),
      this._edges,
    );
  }

  withoutNode(nodeId: string): Mindmap {
    return new Mindmap(
      this._nodes.filter((node) => node.id !== nodeId),
      this._edges,
    );
  }

  withEdge(edge: MindmapEdge): Mindmap {
    return new Mindmap(this._nodes, [...this._edges, edge]);
  }

  withoutEdge(edgeId: string): Mindmap {
    return new Mindmap(
      this._nodes,
      this._edges.filter((edge) => edge.id !== edgeId),
    );
  }
}
