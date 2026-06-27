import { type Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { mutationOptions, useMutation } from '@tanstack/react-query';

import { api } from 'src/api';
import { Field, FieldLabel } from 'src/components/field';
import { Markdown } from 'src/components/markdown';
import { Select, SelectItem } from 'src/components/select';

import { ModelSelector } from './model-selector';
import { PostureDescription, PostureLabel, PostureOption } from './posture';
import { SidebarSection } from './sidebar-section';
import { Timer } from './timer';
import { TopicsList } from './topics-list';

export function SessionSidebar({ session }: { session: Shared.Session }) {
  const { mutate: setPosture } = useMutation(setPostureOptions(session.id));
  const { mutate: addTopic } = useMutation(addTopicOptions(session.id));
  const { mutate: startTimer } = useMutation(startTimerOptions(session.id));
  const { mutate: clearTimer } = useMutation(clearTimerOptions(session.id));
  const { mutate: pauseTimer } = useMutation(pauseTimerOptions(session.id));
  const { mutate: resumeTimer } = useMutation(resumeTimerOptions(session.id));

  return (
    <aside className="col sticky top-0 max-h-full w-64 scrollbar-thin gap-6 overflow-y-auto p-2 lg:w-92">
      <Timer
        timer={session.timer}
        onStart={startTimer}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onClear={clearTimer}
      />

      <TopicsList topics={session.topics} onAdd={addTopic} />
      <PostureSection session={session} onSetPosture={setPosture} />
      <ModelSelectorSection session={session} />

      {session.notes.length > 0 && (
        <SidebarSection title={<Trans>Notes</Trans>}>
          <ul className="col gap-2">
            {session.notes.map((note) => (
              <li key={note.id} className="bg-accent rounded-md p-2">
                <Markdown markdown={note.content} title={note.content} className="line-clamp-2 text-sm" />
              </li>
            ))}
          </ul>
        </SidebarSection>
      )}
    </aside>
  );
}

function PostureSection({
  session,
  onSetPosture,
}: {
  session: Shared.Session;
  onSetPosture: (posture: string) => void;
}) {
  const value = session.postureMode === 'auto' ? 'auto' : session.posture;

  const renderValue = () => {
    if (session.postureMode === 'auto') {
      return (
        <div className="row items-center gap-2">
          <Trans>
            <PostureLabel posture={session.posture} />
            <span className="text-dim text-sm">(Automatic)</span>
          </Trans>
        </div>
      );
    }

    return <PostureLabel posture={session.posture} />;
  };

  return (
    <SidebarSection title={<Trans>Stance</Trans>}>
      <Field>
        <Select value={value} onValueChange={onSetPosture} renderValue={renderValue}>
          <SelectItem value="auto">
            <PostureOption
              label={<Trans>Automatic</Trans>}
              description={<Trans>Assistant picks the best stance</Trans>}
            />
          </SelectItem>
          {(['socratic', 'devils_advocate', 'examiner', 'advisor', 'mirror'] as const).map((posture) => (
            <SelectItem key={posture} value={posture}>
              <PostureOption
                label={<PostureLabel posture={posture} />}
                description={<PostureDescription posture={posture} />}
              />
            </SelectItem>
          ))}
        </Select>
      </Field>
    </SidebarSection>
  );
}

function ModelSelectorSection({ session }: { session: Shared.Session }) {
  const { mutate: setModel } = useMutation(setModelOptions(session.id));

  return (
    <SidebarSection>
      <Field>
        <FieldLabel className="text-dim-50 mb-1 text-xs font-medium uppercase">
          <Trans>Model</Trans>
        </FieldLabel>
        <ModelSelector value={session.model} onChange={setModel} />
      </Field>
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
