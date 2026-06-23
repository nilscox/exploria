import type { Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import clsx from 'clsx';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from 'src/components/button';
import { Input } from 'src/components/input';

export function TopicsList({ topics, onAdd }: { topics: Shared.Topic[]; onAdd: (label: string) => void }) {
  const [showAddTopic, setShowAddTopic] = useState(false);

  return (
    <section className="col gap-2">
      <div className="row items-center justify-between gap-2">
        <h2 className="text-dim text-xs font-medium uppercase">
          <Trans>Topics</Trans>
        </h2>
        <Button variant="ghost" size="icon" onClick={() => setShowAddTopic(!showAddTopic)}>
          <PlusIcon className="size-4" />
        </Button>
      </div>

      {topics.length === 0 && (
        <div className="text-dim col min-h-16 items-center justify-center text-sm">
          <Trans>No topic yet.</Trans>
        </div>
      )}

      {topics.length > 0 && (
        <ul className="col gap-2">
          {topics.map((topic) => (
            <li key={topic.id}>
              <TopicItem topic={topic} />
            </li>
          ))}
        </ul>
      )}

      {showAddTopic && (
        <AddTopicForm
          onSubmit={(label: string) => {
            onAdd(label);
            setShowAddTopic(false);
          }}
          onCancel={() => setShowAddTopic(false)}
        />
      )}
    </section>
  );
}

function TopicItem({ topic }: { topic: Shared.Topic }) {
  return (
    <div
      className={clsx(
        'row gap-2 items-center text-start font-medium px-2 py-1 w-full transition-colors',
        topic.status === 'in_progress' && 'rounded-md border bg-accent',
        topic.status === 'done' && 'opacity-50',
      )}
    >
      <span>&bull;</span>
      <span className={clsx(topic.status === 'done' && 'line-through text-dim')}>{topic.label}</span>
      {topic.status === 'done' && <CheckIcon className="ms-auto size-3" />}
    </div>
  );
}

function AddTopicForm({ onSubmit, onCancel }: { onSubmit: (label: string) => void; onCancel: () => void }) {
  const { t } = useLingui();

  const handleSubmit: React.SubmitEventHandler = (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const label = formData.get('label') as string;

    if (label === '') {
      onCancel();
    } else {
      onSubmit(label);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="row items-center gap-2">
      <Input name="label" aria-label={t`Topic label`} />
      <Button type="submit">
        <Trans>Add</Trans>
      </Button>
    </form>
  );
}
