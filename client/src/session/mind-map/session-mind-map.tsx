import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { ImageOffIcon, PlusIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { options } from 'src/api';
import { Button } from 'src/components/button';
import { InlineEdit, NoValue } from 'src/components/inline-edit';
import { Input, Textarea } from 'src/components/input';
import { Markdown } from 'src/components/markdown';
import { assert } from 'src/utils';

import { MindMap, type Edge, type Node } from './mind-map';

export function SessionMindMap({
  session,
  expanded,
  toggleExpanded,
}: {
  session: Shared.Session;
  expanded?: boolean;
  toggleExpanded?: () => void;
}) {
  const { t } = useLingui();

  const rootLabel = session.subject || t`Subject to be defined`;
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const { height: detailHeight, resizing, startResize } = useResizeRow({ initial: 200, minimum: 80 });

  const { nodes, edges } = useMemo(
    () => toGraph(session.topics, session.notes, rootLabel),
    [session.topics, session.notes, rootLabel],
  );

  if (nodes.length === 1) {
    return (
      <div className="bg-neutral grid flex-1 place-items-center">
        <div className="col gap-2">
          <ImageOffIcon className="text-accent size-32" />
          <span className="text-dim font-medium">
            <Trans>No mind map yet.</Trans>
          </span>
        </div>
      </div>
    );
  }

  const selectedTopic = session.topics.find((topic) => topic.id === selectedTopicId);

  return (
    <div className="col h-full">
      <MindMap
        nodes={nodes}
        edges={edges}
        selectedNode={selectedTopicId}
        onNodeSelected={setSelectedTopicId}
        expanded={expanded}
        toggleExpanded={toggleExpanded}
        className="min-h-0 flex-1"
      />

      <RowResizeHandle resizing={resizing} onPointerDown={startResize} />

      <div style={{ height: `${detailHeight}px` }} className="shrink-0 overflow-auto">
        {selectedTopic ? (
          <TopicDetail session={session} topic={selectedTopic} />
        ) : (
          <p className="text-dim p-4 text-center text-sm">
            <Trans>Select a topic to see its details.</Trans>
          </p>
        )}
      </div>
    </div>
  );
}

function useResizeRow({ initial, minimum }: { initial: number; minimum: number }) {
  const [resizing, setResizing] = useState(false);
  const [height, setHeight] = useState(initial);

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      setResizing(true);

      const startY = event.clientY;
      const startHeight = height;

      const onMove = (moveEvent: PointerEvent) => {
        const delta = startY - moveEvent.clientY;
        setHeight(Math.min(Math.max(startHeight + delta, minimum), window.innerHeight * 0.7));
      };

      const onUp = () => {
        setResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.userSelect = '';
      };

      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [height, minimum],
  );

  return { height, resizing, startResize };
}

function RowResizeHandle({
  resizing,
  onPointerDown,
}: {
  resizing: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="group flex h-3 w-full shrink-0 cursor-row-resize items-center justify-center border-t"
    >
      <div
        className={clsx(
          'h-1 w-8 rounded-full bg-border transition-colors group-hover:bg-primary/60',
          resizing && 'bg-primary/60',
        )}
      />
    </div>
  );
}

function toGraph(topics: Shared.Topic[], notes: Shared.Note[], rootLabel: string): { nodes: Node[]; edges: Edge[] } {
  const getNotes = (topicId: string | null) => notes.filter((note) => note.parentId === topicId);
  const nodes: Node[] = [{ id: 'root', data: { label: rootLabel, notesCount: getNotes(null).length } }];
  const edges: Edge[] = [];

  for (const topic of topics) {
    nodes.push({ id: topic.id, data: { label: topic.label, notesCount: getNotes(topic.id).length } });
    edges.push({ id: topic.id, source: topic.parentId ?? 'root', target: topic.id });
  }

  return { nodes, edges };
}

function TopicDetail({ session, topic }: { session: Shared.Session; topic: Shared.Topic }) {
  const { t } = useLingui();
  const { mutateAsync: updateTopic } = useMutation(options.sessions.updateTopic(session.id));

  const [addingNote, setAddingNote] = useState(false);
  const { mutateAsync: addNote } = useMutation({
    ...options.sessions.addNote(session.id),
    onSuccess: () => setAddingNote(false),
  });

  const notes = session.notes.filter((note) => note.parentId === topic.id);

  return (
    <div className="col flex-1 gap-4 p-3">
      <InlineEdit
        required
        label={t`Edit topic label`}
        placeholder={t`Topic label`}
        value={topic.label}
        onSubmit={(label) => updateTopic({ topicId: topic.id, label })}
        className="text-lg font-semibold"
      >
        {topic.label}
      </InlineEdit>

      <section className="col gap-1">
        <InlineEdit
          multiline
          value={topic.summary ?? ''}
          label={t`Edit topic summary`}
          placeholder={t`Topic summary`}
          onSubmit={(summary) => updateTopic({ topicId: topic.id, summary })}
          className="text-sm"
        >
          {topic.summary ? (
            <Markdown markdown={topic.summary} />
          ) : (
            <NoValue>
              <Trans>No summary.</Trans>
            </NoValue>
          )}
        </InlineEdit>
      </section>

      <hr />

      <section className="col gap-2">
        {notes.length === 0 && (
          <NoValue>
            <Trans>No notes on this topic.</Trans>
          </NoValue>
        )}

        {notes.map((note) => (
          <NoteCard key={note.id} sessionId={session.id} note={note} />
        ))}

        <div className="mt-2">
          {addingNote ? (
            <AddNoteForm
              onSubmit={(title, content) => addNote({ topicId: topic.id, title, content })}
              onCancel={() => setAddingNote(false)}
            />
          ) : (
            <Button variant="ghost" size="small" onClick={() => setAddingNote(true)}>
              <PlusIcon className="size-4" />
              <Trans>Add note</Trans>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function AddNoteForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string, content: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useLingui();

  const action = async (formData: FormData) => {
    const title = formData.get('title');
    const content = formData.get('content');

    assert(typeof title === 'string');
    assert(typeof content === 'string');

    await onSubmit(title, content).catch(() => {});
  };

  return (
    <form action={action} className="col gap-2">
      <Input required name="title" placeholder={t`Note title`} className="text-sm font-semibold" />

      <Textarea required name="content" placeholder={t`Note content`} className="text-xs" rows={3} />

      <div className="row items-center gap-2">
        <Button type="submit" size="small">
          <Trans>Add</Trans>
        </Button>
        <Button type="button" variant="secondary" size="small" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </form>
  );
}

function NoteCard({ sessionId, note }: { sessionId: string; note: Shared.Note }) {
  const { t } = useLingui();
  const { mutateAsync: updateNote } = useMutation(options.sessions.updateNote(sessionId));

  return (
    <div className="border-primary bg-accent col gap-1 rounded-md border-l-2 p-2">
      <InlineEdit
        required
        value={note.title}
        label={t`Edit note title`}
        placeholder={t`Note title`}
        onSubmit={(title) => updateNote({ noteId: note.id, title })}
        className="text-sm font-semibold"
      >
        {note.title}
      </InlineEdit>

      <InlineEdit
        required
        multiline
        value={note.content}
        label={t`Edit note content`}
        placeholder={t`Note content`}
        onSubmit={(content) => updateNote({ noteId: note.id, content })}
        className="text-xs"
      >
        <Markdown markdown={note.content} className="text-xs" />
      </InlineEdit>
    </div>
  );
}
