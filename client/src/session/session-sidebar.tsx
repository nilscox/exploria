import { type Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { mutationOptions, useMutation } from '@tanstack/react-query';
import { BotIcon, MessageSquareTextIcon } from 'lucide-react';

import { api } from 'src/api';
import { Field, FieldLabel } from 'src/components/field';
import { Markdown } from 'src/components/markdown';

import { ModelSelector } from './model-selector';
import { PostureSection } from './posture';
import { SidebarSection } from './sidebar-section';
import { Timer } from './timer';
import { TopicsListSection } from './topics-list';

export function SessionSidebar({ session }: { session: Shared.Session }) {
  const { mutate: setPosture } = useMutation(setPostureOptions(session.id));
  const { mutate: addTopic } = useMutation(addTopicOptions(session.id));
  const { mutate: startTimer } = useMutation(startTimerOptions(session.id));
  const { mutate: clearTimer } = useMutation(clearTimerOptions(session.id));
  const { mutate: pauseTimer } = useMutation(pauseTimerOptions(session.id));
  const { mutate: resumeTimer } = useMutation(resumeTimerOptions(session.id));

  return (
    <aside className="col sticky top-0 max-h-full w-full scrollbar-thin gap-6 overflow-y-auto p-2 lg:w-92">
      <Timer
        timer={session.timer}
        onStart={startTimer}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onClear={clearTimer}
      />
      <TopicsListSection topics={session.topics} onAdd={addTopic} />
      <PostureSection session={session} onSetPosture={setPosture} />
      <NotesSection session={session} />
      <ModelSelectorSection session={session} />
    </aside>
  );
}

function ModelSelectorSection({ session }: { session: Shared.Session }) {
  const { mutate: setModel } = useMutation(setModelOptions(session.id));

  return (
    <SidebarSection Icon={BotIcon} title={<Trans>Model</Trans>}>
      <Field>
        <FieldLabel className="sr-only">
          <Trans>Model</Trans>
        </FieldLabel>
        <ModelSelector value={session.model} onChange={setModel} />
      </Field>
    </SidebarSection>
  );
}

function NotesSection({ session }: { session: Shared.Session }) {
  if (session.notes.length === 0) {
    return null;
  }

  return (
    <SidebarSection Icon={MessageSquareTextIcon} title={<Trans>Notes</Trans>}>
      <ul className="col gap-2">
        {session.notes.map((note) => (
          <li key={note.id} className="border-primary bg-accent rounded-md border-l-2 p-2">
            <Markdown markdown={note.content} title={note.content} className="line-clamp-2 text-sm" />
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}

function setPostureOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: (posture: string) => api.sessions.setPosture(sessionId, posture),
  });
}

function setModelOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: (model: string) => api.sessions.setModel(sessionId, model),
  });
}

function addTopicOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: (label: string) => api.sessions.addTopic(sessionId, label),
  });
}

function startTimerOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: (duration: number) => api.sessions.timer.start(sessionId, duration),
  });
}

function clearTimerOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: () => api.sessions.timer.clear(sessionId),
  });
}

function pauseTimerOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: () => api.sessions.timer.pause(sessionId),
  });
}

function resumeTimerOptions(sessionId: string) {
  return mutationOptions({
    mutationFn: () => api.sessions.timer.resume(sessionId),
  });
}
