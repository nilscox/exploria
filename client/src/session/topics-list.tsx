import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import clsx from 'clsx';
import { ListChecksIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from 'src/components/button';
import { Input } from 'src/components/input';

import { SidebarSection } from './sidebar-section';

export function TopicsListSection({ topics, onAdd }: { topics: Shared.Topic[]; onAdd: (label: string) => void }) {
  return (
    <SidebarSection Icon={ListChecksIcon} title={<Trans>Topics</Trans>}>
      {topics.length > 0 && (
        <ul className="col gap-1.5">
          {topics.map((topic) => (
            <li key={topic.id}>
              <TopicItem topic={topic} />
            </li>
          ))}
        </ul>
      )}

      <AddTopicForm onSubmit={onAdd} />
    </SidebarSection>
  );
}

function TopicItem({ topic }: { topic: Shared.Topic }) {
  return (
    <div
      className={clsx(
        'row bg-neutral items-center gap-2.5 rounded-lg border px-3 py-2',
        topic.status === 'in_progress' && 'shadow-sm',
      )}
    >
      <TopicDot status={topic.status} />

      <span
        className={clsx(
          'flex-1 text-sm font-medium',
          topic.status === 'done' && 'text-dim decoration-foreground/20 line-through',
        )}
      >
        {topic.label}
      </span>

      <TopicStatusBadge status={topic.status} />
    </div>
  );
}

function TopicDot({ status }: { status: Shared.TopicStatus }) {
  return (
    <span
      className={clsx(
        'size-2 shrink-0 rounded-full self-start mt-1.5',
        status === 'in_progress' && 'bg-primary',
        status === 'pending' && 'bg-foreground/30',
        status === 'done' && 'bg-foreground/20 opacity-60',
      )}
    />
  );
}

function TopicStatusBadge({ status }: { status: Shared.TopicStatus }) {
  return (
    <span
      className={clsx(
        'shrink-0 font-mono text-xs',
        status === 'in_progress' && 'text-primary',
        status !== 'in_progress' && 'text-dim',
      )}
    >
      {status === 'done' && <Trans>Done</Trans>}
      {status === 'in_progress' && <Trans>In progress</Trans>}
      {status === 'pending' && <Trans>To do</Trans>}
    </span>
  );
}

function AddTopicForm({ onSubmit }: { onSubmit: (label: string) => void }) {
  const { t } = useLingui();
  const [value, setValue] = useState('');

  const handleSubmit: React.SubmitEventHandler = (event) => {
    event.preventDefault();

    if (value !== '') {
      onSubmit(value);
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="row mt-2 items-stretch gap-1">
      <Input
        name="label"
        aria-label={t`Add topic`}
        placeholder={t`Add a topic...`}
        value={value}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
        className="text-sm"
      />
      <Button
        type="submit"
        variant="outlined"
        size="icon"
        disabled={value.trim() === ''}
        className="bg-neutral aspect-square"
      >
        <PlusIcon className="size-4" />
      </Button>
    </form>
  );
}
