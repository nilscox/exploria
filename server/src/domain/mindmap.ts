import type { Note, SessionEvent, TopicStatus } from './session.ts';

export type MindmapNode = {
  id: string;
  parentId: string | null;
  label: string;
  status?: TopicStatus;
  summary?: string;
};

type MindmapState = {
  subject: string;
  nodes: MindmapNode[];
  notes: Note[];
};

export class Mindmap {
  readonly subject: string;
  readonly nodes: MindmapNode[];
  readonly notes: Note[];

  constructor(state: Partial<MindmapState> = {}) {
    this.subject = state.subject ?? '';
    this.nodes = state.nodes ?? [];
    this.notes = state.notes ?? [];
  }

  hasNode(nodeId: string): boolean {
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

  getNote(noteId: string): Note | undefined {
    return this.notes.find((note) => note.id === noteId);
  }

  notesOf(parentId: string | null): Note[] {
    return this.notes.filter((note) => note.parentId === parentId);
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

  apply(event: SessionEvent): Mindmap {
    switch (event.type) {
      case 'SubjectChanged':
        return this.withSubject(event.subject);

      case 'MindmapNodeAdded':
        return this.withNodeAdded(event.node);

      case 'MindmapNodeRemoved':
        return this.withNodeRemoved(event.nodeId);

      case 'MindmapNodeLabelChanged':
        return this.withNodeLabel(event.nodeId, event.label);

      case 'MindmapNodeStatusChanged':
        return this.withNodeStatus(event.nodeId, event.status);

      case 'MindmapNodeSummaryChanged':
        return this.withNodeSummary(event.nodeId, event.summary);

      case 'MindmapNodeMoved':
        return this.withNodeMoved(event.nodeId, event.parentId);

      case 'NoteAdded':
        return this.withNoteAdded(event.note);

      case 'NoteRemoved':
        return this.withNoteRemoved(event.noteId);

      case 'NoteTitleChanged':
        return this.withNoteTitle(event.noteId, event.title);

      case 'NoteContentChanged':
        return this.withNoteContent(event.noteId, event.content);

      case 'NoteMoved':
        return this.withNoteMoved(event.noteId, event.parentId);

      default:
        return this;
    }
  }

  withSubject(subject: string): Mindmap {
    return this.withState({ subject });
  }

  withNodeAdded(node: MindmapNode): Mindmap {
    return this.withState({ nodes: [...this.nodes, node] });
  }

  withNodeRemoved(nodeId: string): Mindmap {
    return this.withState({ nodes: this.nodes.filter((node) => node.id !== nodeId) });
  }

  withNodeLabel(nodeId: string, label: string): Mindmap {
    return this.withState({ nodes: this.mapNode(nodeId, (node) => ({ ...node, label })) });
  }

  withNodeStatus(nodeId: string, status: TopicStatus): Mindmap {
    return this.withState({ nodes: this.mapNode(nodeId, (node) => ({ ...node, status })) });
  }

  withNodeSummary(nodeId: string, summary: string): Mindmap {
    return this.withState({ nodes: this.mapNode(nodeId, (node) => ({ ...node, summary })) });
  }

  withNodeMoved(nodeId: string, parentId: string | null): Mindmap {
    return this.withState({
      nodes: this.mapNode(nodeId, (node) => {
        const moved: MindmapNode = { ...node, parentId };

        if (parentId === null) {
          moved.status ??= 'pending';
        } else {
          delete moved.status;
        }

        return moved;
      }),
    });
  }

  withNoteAdded(note: Note): Mindmap {
    return this.withState({ notes: [...this.notes, note] });
  }

  withNoteRemoved(noteId: string): Mindmap {
    return this.withState({ notes: this.notes.filter((note) => note.id !== noteId) });
  }

  withNoteTitle(noteId: string, title: string): Mindmap {
    return this.withState({ notes: this.mapNote(noteId, (note) => ({ ...note, title })) });
  }

  withNoteContent(noteId: string, content: string): Mindmap {
    return this.withState({ notes: this.mapNote(noteId, (note) => ({ ...note, content })) });
  }

  withNoteMoved(noteId: string, parentId: string | null): Mindmap {
    return this.withState({ notes: this.mapNote(noteId, (note) => ({ ...note, parentId })) });
  }

  private withState(changes: Partial<MindmapState>): Mindmap {
    return new Mindmap({ subject: this.subject, nodes: this.nodes, notes: this.notes, ...changes });
  }

  private mapNode(nodeId: string, fn: (node: MindmapNode) => MindmapNode): MindmapNode[] {
    return this.nodes.map((node) => (node.id === nodeId ? fn(node) : node));
  }

  private mapNote(noteId: string, fn: (note: Note) => Note): Note[] {
    return this.notes.map((note) => (note.id === noteId ? fn(note) : note));
  }
}
