import type { TopicStatus } from './session.ts';

export type MindmapNode = {
  id: string;
  parentId: string | null;
  label: string;
  status?: TopicStatus;
};

export class Mindmap {
  private readonly nodes: MindmapNode[];

  constructor(nodes: MindmapNode[]) {
    this.nodes = nodes;
  }

  has(nodeId: string): boolean {
    return this.nodes.some((node) => node.id === nodeId);
  }

  get(nodeId: string): MindmapNode | undefined {
    return this.nodes.find((node) => node.id === nodeId);
  }

  children(parentId: string | null): MindmapNode[] {
    return this.nodes.filter((node) => node.parentId === parentId);
  }

  topics(): MindmapNode[] {
    return this.children(null);
  }

  subtree(nodeId: string): MindmapNode[] {
    const node = this.get(nodeId);

    if (!node) {
      return [];
    }

    const result: MindmapNode[] = [];

    const walk = (current: MindmapNode) => {
      for (const child of this.children(current.id)) {
        walk(child);
      }

      result.push(current);
    };

    walk(node);

    return result;
  }

  isDescendant(nodeId: string, ancestorId: string): boolean {
    let current = this.get(nodeId);

    while (current?.parentId != null) {
      if (current.parentId === ancestorId) {
        return true;
      }

      current = this.get(current.parentId);
    }

    return false;
  }
}
