import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import clsx from 'clsx';
import {
  BotIcon,
  CheckIcon,
  DramaIcon,
  ListIcon,
  PencilIcon,
  SearchIcon,
  StickyNoteIcon,
  StickyNoteXIcon,
  TimerIcon,
} from 'lucide-react';
import type { SVGProps } from 'react';

import { Button } from 'src/components/button';
import { Markdown } from 'src/components/markdown';
import { debug } from 'src/debug-context';
import { Details } from 'src/details';

import { PostureLabel } from './posture';

type TimelineItem = Shared.TimelineItem;
type TimelineMessage = Extract<TimelineItem, { kind: 'message' }>;

export function Timeline({ items, onSelectPath }: { items: TimelineItem[]; onSelectPath: (pathId: string) => void }) {
  return items.map((item, index) => <TimelineEntry key={index} item={item} onSelectPath={onSelectPath} />);
}

function TimelineEntry({ item, onSelectPath }: { item: TimelineItem; onSelectPath: (pathId: string) => void }) {
  if (item.kind === 'message') {
    return <MessageItem message={item} onSelectPath={onSelectPath} />;
  }

  const Component = components[item.kind] as React.ComponentType<{ item: TimelineItem }>;

  return <Component item={item} />;
}

const components: {
  [Item in TimelineItem as Exclude<Item['kind'], 'message'>]: React.ComponentType<{ item: Item }>;
} = {
  'model-changed': ({ item }) => (
    <Notification Icon={BotIcon}>
      <Trans>Model changed: {item.model}</Trans>
    </Notification>
  ),

  'subject-changed': ({ item }) => (
    <Notification Icon={PencilIcon}>
      <Trans>Subject changed: {item.subject}</Trans>
    </Notification>
  ),

  'topic-added': ({ item }) => (
    <Notification Icon={ListIcon}>
      <Trans>Topic added: {item.label}</Trans>
    </Notification>
  ),

  'topic-removed': ({ item }) => (
    <Notification Icon={ListIcon}>
      <Trans>Topic removed: {item.label}</Trans>
    </Notification>
  ),

  'topic-label-changed': ({ item }) => (
    <Notification Icon={ListIcon}>
      <Trans>
        Topic renamed: {item.oldLabel} → {item.newLabel}
      </Trans>
    </Notification>
  ),

  'topic-status-changed': ({ item }) => (
    <Notification Icon={item.status === 'done' ? CheckIcon : ListIcon}>
      <Trans>
        Status of "{item.label}": <TopicStatusLabel status={item.status} />
      </Trans>
    </Notification>
  ),

  'note-added': ({ item }) => (
    <Notification Icon={StickyNoteIcon}>
      <Trans>Note added: {item.content}</Trans>
    </Notification>
  ),

  'note-removed': ({ item }) => (
    <Notification Icon={StickyNoteXIcon}>
      <Trans>Note removed: {item.content}</Trans>
    </Notification>
  ),

  'note-content-changed': ({ item }) => (
    <Notification Icon={StickyNoteIcon}>
      <Trans>Note updated: {item.content}</Trans>
    </Notification>
  ),

  'timer-started': ({ item }) => (
    <Notification Icon={TimerIcon}>
      <Trans>Timer started: {item.duration} minutes</Trans>
    </Notification>
  ),

  'timer-cleared': () => (
    <Notification Icon={TimerIcon}>
      <Trans>Timer cleared</Trans>
    </Notification>
  ),

  'timer-paused': () => (
    <Notification Icon={TimerIcon}>
      <Trans>Timer paused</Trans>
    </Notification>
  ),

  'timer-resumed': () => (
    <Notification Icon={TimerIcon}>
      <Trans>Timer resumed</Trans>
    </Notification>
  ),

  'posture-changed': ({ item }) => <PostureChanged item={item} />,

  'web-searched': ({ item }) => (
    <Notification Icon={SearchIcon}>
      <Trans>
        Search: "{item.query}" ({item.resultCount} result(s))
      </Trans>
    </Notification>
  ),
};

function PostureChanged({ item }: { item: Extract<TimelineItem, { kind: 'posture-changed' }> }) {
  if (item.forced) {
    return (
      <Notification Icon={DramaIcon}>
        {item.posture === 'auto' ? (
          <Trans>Back to automatic stance</Trans>
        ) : (
          <Trans>
            Stance forced: <PostureLabel posture={item.posture} />
          </Trans>
        )}
      </Notification>
    );
  }

  return (
    <Notification Icon={DramaIcon}>
      <Trans>
        <PostureLabel posture={item.posture} />: {item.reason}
      </Trans>
    </Notification>
  );
}

function Notification({
  Icon,
  children,
}: {
  Icon: React.ComponentType<SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <div className="text-dim row items-center gap-1 text-sm">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate leading-none">{children}</span>
    </div>
  );
}

function TopicStatusLabel({ status }: { status: Shared.TopicStatus }) {
  return {
    pending: <Trans>pending</Trans>,
    in_progress: <Trans>in progress</Trans>,
    done: <Trans>done</Trans>,
  }[status];
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
      <Markdown
        markdown={message.content}
        className={clsx(message.role === 'user' && 'bg-accent px-4 py-2 rounded-md')}
      />

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

  return (
    <div className="col gap-2">
      {paths.map((path) => (
        <Button
          key={path.id}
          variant={path.selected ? 'solid' : 'outlined'}
          disabled={path.selected !== undefined}
          className={clsx(
            'h-auto text-start whitespace-normal! py-2 justify-start disabled:pointer-events-none',
            path.selected === false && 'opacity-50',
          )}
          onClick={() => onSelect(path.id)}
        >
          <div className="col gap-0.5">
            <span className="font-medium">{path.label}</span>
            {path.description && <span className="text-dim">{path.description}</span>}
          </div>
        </Button>
      ))}
    </div>
  );
}
