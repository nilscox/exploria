export type Node = {
  id: string;
  data: { label: string; notesCount: number };
};

export type Edge = {
  id: string;
  source: string;
  target: string;
};

export type Size = { width: number; height: number };
export type Position2D = { x: number; y: number };

export type NodeVariant = 'root' | 'internal' | 'leaf';
export type Side = 'left' | 'right';

export type Branches = {
  color: Map<string, string>;
  variant: Map<string, NodeVariant>;
  side: Map<string, Side>;
};

const COLUMN_GAP = 90;
const ROW_GAP = 26;

const BRANCH_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6'];

export function computeBranches(nodes: Node[], edges: Edge[]): Branches {
  const color = new Map<string, string>();
  const variant = new Map<string, NodeVariant>();
  const side = new Map<string, Side>();

  if (nodes.length === 0) {
    return { color, variant, side };
  }

  const root = findRoot(nodes, edges);
  const parents = new Set(edges.map((edge) => edge.source));

  for (const node of nodes) {
    variant.set(node.id, node.id === root ? 'root' : parents.has(node.id) ? 'internal' : 'leaf');
  }

  const rootChildren = edges.filter((edge) => edge.source === root).map((edge) => edge.target);
  const splitIndex = Math.ceil(rootChildren.length / 2);

  rootChildren.forEach((child, index) => {
    const branchColor = BRANCH_COLORS[index % BRANCH_COLORS.length]!;
    const branchSide: Side = index < splitIndex ? 'left' : 'right';

    for (const id of descendants(child, edges)) {
      color.set(id, branchColor);
      side.set(id, branchSide);
    }
  });

  return { color, variant, side };
}

export function layoutMindMap(nodes: Node[], edges: Edge[], sizes: Map<string, Size>): Map<string, Position2D> {
  const positions = new Map<string, Position2D>();

  if (nodes.length === 0) {
    return positions;
  }

  const root = findRoot(nodes, edges);
  const children = childrenByParent(edges);
  const sizeOf = (id: string): Size => sizes.get(id)!;

  const rootChildren = children.get(root) ?? [];
  const splitIndex = Math.ceil(rootChildren.length / 2);
  const perSide: Record<Side, string[]> = {
    left: rootChildren.slice(0, splitIndex),
    right: rootChildren.slice(splitIndex),
  };

  const side = new Map<string, Side>();
  const depth = new Map<string, number>([[root, 0]]);
  const centerY = new Map<string, number>();

  const place = (id: string, nodeSide: Side, nodeDepth: number, cursor: { value: number }): void => {
    side.set(id, nodeSide);
    depth.set(id, nodeDepth);

    const kids = children.get(id) ?? [];

    if (kids.length === 0) {
      const height = sizeOf(id).height;

      centerY.set(id, cursor.value + height / 2);
      cursor.value += height + ROW_GAP;

      return;
    }

    for (const kid of kids) {
      place(kid, nodeSide, nodeDepth + 1, cursor);
    }

    centerY.set(id, (centerY.get(kids[0]!)! + centerY.get(kids.at(-1)!)!) / 2);
  };

  for (const nodeSide of ['left', 'right'] as const) {
    const cursor = { value: 0 };

    for (const child of perSide[nodeSide]) {
      place(child, nodeSide, 1, cursor);
    }

    centerSide(side, centerY, sizeOf, nodeSide);
  }

  centerY.set(root, 0);

  const columnCenterX = computeColumnCenterX(nodes, root, side, depth, sizeOf);

  for (const node of nodes) {
    const size = sizeOf(node.id);
    const cx = node.id === root ? 0 : (columnCenterX.get(`${side.get(node.id)}:${depth.get(node.id)}`) ?? 0);

    positions.set(node.id, { x: cx - size.width / 2, y: (centerY.get(node.id) ?? 0) - size.height / 2 });
  }

  return positions;
}

function centerSide(
  side: Map<string, Side>,
  centerY: Map<string, number>,
  sizeOf: (id: string) => Size,
  nodeSide: Side,
): void {
  const ids = [...side].filter(([, value]) => value === nodeSide).map(([id]) => id);

  if (ids.length === 0) {
    return;
  }

  const tops = ids.map((id) => centerY.get(id)! - sizeOf(id).height / 2);
  const bottoms = ids.map((id) => centerY.get(id)! + sizeOf(id).height / 2);
  const offset = -(Math.min(...tops) + Math.max(...bottoms)) / 2;

  for (const id of ids) {
    centerY.set(id, centerY.get(id)! + offset);
  }
}

function computeColumnCenterX(
  nodes: Node[],
  root: string,
  side: Map<string, Side>,
  depth: Map<string, number>,
  sizeOf: (id: string) => Size,
): Map<string, number> {
  const columnWidth = new Map<string, number>();

  for (const node of nodes) {
    if (node.id === root) {
      continue;
    }

    const key = `${side.get(node.id)}:${depth.get(node.id)}`;

    columnWidth.set(key, Math.max(columnWidth.get(key) ?? 0, sizeOf(node.id).width));
  }

  const centerX = new Map<string, number>();
  const rootHalf = sizeOf(root).width / 2;

  for (const nodeSide of ['left', 'right'] as const) {
    let distance = rootHalf;
    let previousHalf = rootHalf;

    for (let d = 1; columnWidth.has(`${nodeSide}:${d}`); d++) {
      const half = columnWidth.get(`${nodeSide}:${d}`)! / 2;

      distance += previousHalf + COLUMN_GAP + half;
      centerX.set(`${nodeSide}:${d}`, nodeSide === 'left' ? -distance : distance);
      previousHalf = half;
    }
  }

  return centerX;
}

function findRoot(nodes: Node[], edges: Edge[]): string {
  const targets = new Set(edges.map((edge) => edge.target));

  return (nodes.find((node) => !targets.has(node.id)) ?? nodes[0]!).id;
}

function childrenByParent(edges: Edge[]): Map<string, string[]> {
  const children = new Map<string, string[]>();

  for (const edge of edges) {
    const siblings = children.get(edge.source) ?? [];

    siblings.push(edge.target);
    children.set(edge.source, siblings);
  }

  return children;
}

function descendants(start: string, edges: Edge[]): Set<string> {
  const ids = new Set<string>([start]);
  const queue = [start];

  while (queue.length > 0) {
    const id = queue.shift()!;

    for (const child of edges.filter((edge) => edge.source === id).map((edge) => edge.target)) {
      if (!ids.has(child)) {
        ids.add(child);
        queue.push(child);
      }
    }
  }

  return ids;
}
