import type { Shared } from '@exploria/server/shared';
import clsx from 'clsx';

import { Button } from 'src/components/button';
import { Markdown } from 'src/components/markdown';
import { debug } from 'src/debug-context';
import { Details } from 'src/details';

type TimelineItem = Shared.TimelineItem;
type TimelineMessage = Extract<TimelineItem, { kind: 'message' }>;

export function Timeline({ items, onSelectPath }: { items: TimelineItem[]; onSelectPath: (pathId: string) => void }) {
  return items.map((item, index) => <TimelineEntry key={index} item={item} onSelectPath={onSelectPath} />);
}

function TimelineEntry({ item, onSelectPath }: { item: TimelineItem; onSelectPath: (pathId: string) => void }) {
  switch (item.kind) {
    case 'message':
      return <MessageItem message={item} onSelectPath={onSelectPath} />;
    case 'topic-added':
      return <Notification>Sujet ajouté : {item.label}</Notification>;
    case 'timer-started':
      return <Notification>Chronomètre démarré : {item.duration} minutes</Notification>;
    case 'timer-cleared':
      return <Notification>Chronomètre annulé</Notification>;
    case 'timer-paused':
      return <Notification>Chronomètre mis en pause</Notification>;
    case 'timer-resumed':
      return <Notification>Chronomètre redémarré</Notification>;
  }
}

function Notification({ children }: { children: React.ReactNode }) {
  return <div className="text-dim text-sm">{children}</div>;
}

function MessageItem({ message, onSelectPath }: { message: TimelineMessage; onSelectPath: (pathId: string) => void }) {
  if (message.role === 'system') {
    if (!debug()) {
      return null;
    }

    return (
      <Details className="text-dim text-sm" summary="System prompt">
        <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </Details>
    );
  }

  return (
    <>
      {message.content !== '' && (
        <Markdown
          markdown={message.content}
          className={clsx(message.role === 'user' && 'bg-accent px-4 py-2 rounded-md')}
        />
      )}

      {message.role === 'assistant' && debug() && <ToolCalls toolCalls={message.toolCalls} />}
      {message.paths && <DiscussionPaths paths={message.paths} onSelect={onSelectPath} />}
    </>
  );
}

function ToolCalls({ toolCalls }: { toolCalls?: Shared.ToolCall[] }) {
  return toolCalls?.map((toolCall) => (
    <Details key={toolCall.id} className="text-dim text-sm" summary={`Tool call ${toolCall.name} (${toolCall.id})`}>
      <div className="text-text bg-accent mt-2 rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
        {JSON.stringify(toolCall.arguments, null, 2)}
      </div>
    </Details>
  ));
}

function DiscussionPaths({ paths, onSelect }: { paths: Shared.SelectablePath[]; onSelect: (pathId: string) => void }) {
  if (paths.length === 0) {
    return null;
  }

  const hasSelection = paths.some((path) => path.selected);

  return (
    <div className="col gap-2">
      {paths.map((path) => (
        <Button
          key={path.id}
          variant={path.selected ? 'solid' : 'outlined'}
          disabled={hasSelection}
          className={clsx('justify-start', hasSelection && !path.selected && 'opacity-50')}
          onClick={() => onSelect(path.id)}
        >
          <span className="font-medium">{path.label}</span>
          {path.description && <span className="text-dim">{path.description}</span>}
        </Button>
      ))}
    </div>
  );
}
