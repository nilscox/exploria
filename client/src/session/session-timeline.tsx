import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import clsx from 'clsx';
import {
  ArrowRightIcon,
  BotIcon,
  CheckIcon,
  ClipboardListIcon,
  DramaIcon,
  ListIcon,
  PencilIcon,
  SearchIcon,
  StickyNoteIcon,
  StickyNoteXIcon,
  TimerIcon,
} from 'lucide-react';
import type { SVGProps } from 'react';

import { Dialog, DialogTrigger } from 'src/components/dialog';
import { Markdown } from 'src/components/markdown';
import { config } from 'src/config-context';
import { Details } from 'src/details';

import { PostureLabel } from './posture';
import { SessionSummaryDialog } from './session-summary';

type TimelineItem = Shared.TimelineItem;
type TimelineMessage = Extract<TimelineItem, { kind: 'message' }>;

export function Timeline({
  session,
  onSelectPath,
}: {
  session: Shared.Session;
  onSelectPath: (pathId: string) => void;
}) {
  return session.timeline.map((item, index) => (
    <TimelineEntry key={index} session={session} item={item} onSelectPath={onSelectPath} />
  ));
}

function TimelineEntry({
  session,
  item,
  onSelectPath,
}: {
  session: Shared.Session;
  item: TimelineItem;
  onSelectPath: (pathId: string) => void;
}) {
  if (item.kind === 'message') {
    return <MessageItem message={item} onSelectPath={onSelectPath} />;
  }

  const { showTimelineActions } = config();

  if (!showTimelineActions) {
    return null;
  }

  if (item.kind === 'summary') {
    return <SummaryItem session={session} item={item} />;
  }

  const Component = components[item.kind] as React.ComponentType<{ item: TimelineItem }>;

  return <Component item={item} />;
}

const components: {
  [Item in TimelineItem as Exclude<Item['kind'], 'message' | 'summary'>]: React.ComponentType<{ item: Item }>;
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
        Topic renamed: {item.oldLabel} <ArrowRightIcon className="mb-0.5 inline-block size-3.5" /> {item.newLabel}
      </Trans>
    </Notification>
  ),

  'topic-status-changed': ({ item }) => (
    <Notification Icon={item.status === 'done' ? CheckIcon : ListIcon}>
      {
        {
          pending: <Trans>Topic "{item.label}" is pending</Trans>,
          in_progress: <Trans>Topic "{item.label}" in progress</Trans>,
          done: <Trans>Topic "{item.label}" done</Trans>,
        }[item.status]
      }
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

function SummaryItem({ session, item }: { session: Shared.Session; item: Extract<TimelineItem, { kind: 'summary' }> }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-dim row max-w-fit cursor-pointer items-center gap-1 text-start text-sm hover:text-inherit"
          >
            <ClipboardListIcon className="size-3.5 shrink-0" />
            <span className="truncate leading-none">
              <Trans>Session summary</Trans>
            </span>
          </button>
        }
      />

      <SessionSummaryDialog session={session} summary={item.summary} />
    </Dialog>
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

function MessageItem({ message, onSelectPath }: { message: TimelineMessage; onSelectPath: (pathId: string) => void }) {
  const { i18n } = useLingui();

  return (
    <div>
      {config().showTimelineDates && (
        <div className="text-dim mb-0.5 text-end text-xs">
          {new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'short', timeStyle: 'short' }).format(
            new Date(message.date),
          )}
        </div>
      )}

      <Markdown
        markdown={message.content}
        className={clsx(message.role === 'user' && 'bg-accent px-4 py-2 rounded-md')}
      />

      {message.role === 'assistant' && config().debug && <ToolCalls toolCalls={message.toolCalls} />}
      {message.paths && <DiscussionPaths paths={message.paths} onSelect={onSelectPath} />}
    </div>
  );
}

function ToolCalls({ toolCalls }: { toolCalls?: Shared.ToolCall[] }) {
  return toolCalls?.map((toolCall) => (
    <Details
      key={toolCall.id}
      className="text-dim my-0.5 text-sm"
      summary={`Tool call ${toolCall.name} (${toolCall.id})`}
    >
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
    <div className="col bg-accent mt-2 gap-2 rounded-lg p-4">
      {paths.map((path) => (
        <button
          key={path.id}
          disabled={path.selected !== undefined}
          className={clsx(
            'col gap-0.5 h-auto text-start py-2 text-sm disabled:pointer-events-none bg-neutral/80 rounded-md p-2 hover:bg-neutral transition-colors',
            path.selected && 'shadow-sm',
            path.selected === false && 'opacity-50',
          )}
          onClick={() => onSelect(path.id)}
        >
          <span className="font-medium">{path.label}</span>
          {path.description && <span className="text-dim">{path.description}</span>}
        </button>
      ))}
    </div>
  );
}
