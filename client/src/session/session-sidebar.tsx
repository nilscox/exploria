import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { mutationOptions, useMutation } from '@tanstack/react-query';

import { api } from 'src/api';
import { Field, FieldLabel } from 'src/components/field';
import { Markdown } from 'src/markdown';

import { ModelSelector } from './model-selector';
import { Timer } from './timer';
import { TopicsList } from './topics-list';

export function SessionSidebar({ session }: { session: Shared.Session }) {
  const { mutate: onPause } = useMutation(pauseTimerOptions(session.id));
  const { mutate: onResume } = useMutation(resumeTimerOptions(session.id));

  return (
    <aside className="col sticky top-0 w-64 gap-6 p-2 lg:w-92">
      <Timer
        timer={session.timer}
        onStart={() => {}}
        onPause={() => onPause()}
        onResume={() => onResume()}
        onClear={() => {}}
      />

      <ModelSelectorSection session={session} />
      <TopicsList topics={session.topics} onAdd={() => {}} />

      {session.notes.length > 0 && (
        <section>
          <h2 className="my-4 text-lg font-semibold">
            <Trans>Notes</Trans>
          </h2>

          <ul className="col gap-2">
            {session.notes.map((note) => (
              <li key={note.id} className="bg-accent rounded-md p-2">
                <Markdown markdown={note.content} title={note.content} className="line-clamp-2" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

function ModelSelectorSection({ session }: { session: Shared.Session }) {
  const { mutate: setModel } = useMutation(setModelOptions(session.id));

  return (
    <section>
      <Field>
        <FieldLabel className="text-dim text-xs font-medium uppercase">
          <Trans>Model</Trans>
        </FieldLabel>
        <ModelSelector value={session.model} onChange={setModel} />
      </Field>
    </section>
  );
}

function setModelOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: (model: string) => api.sessions.setModel(sessionId, model),
  });
}

function pauseTimerOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: () => api.sessions.pauseTimer(sessionId),
  });
}

function resumeTimerOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: () => api.sessions.resumeTimer(sessionId),
  });
}
