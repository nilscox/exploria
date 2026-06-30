import { type Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { useMutation } from '@tanstack/react-query';
import { BotIcon, MessageSquareTextIcon } from 'lucide-react';

import { Field, FieldLabel } from 'src/components/field';
import { Markdown } from 'src/components/markdown';
import { options } from 'src/options';

import { ModelSelector } from './model-selector';
import { PostureSection } from './posture';
import { SidebarSection } from './sidebar-section';
import { Timer } from './timer';
import { TopicsListSection } from './topics-list';

export function SessionSidebar({ session }: { session: Shared.Session }) {
  const { mutate: setPosture } = useMutation(options.sessions.setPosture(session.id));
  const { mutate: addTopic } = useMutation(options.sessions.addTopic(session.id));
  const { mutate: startTimer } = useMutation(options.sessions.timer.start(session.id));
  const { mutate: clearTimer } = useMutation(options.sessions.timer.clear(session.id));
  const { mutate: pauseTimer } = useMutation(options.sessions.timer.pause(session.id));
  const { mutate: resumeTimer } = useMutation(options.sessions.timer.resume(session.id));

  return (
    <div className="col gap-6 p-2">
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
    </div>
  );
}

function ModelSelectorSection({ session }: { session: Shared.Session }) {
  const { mutate: setModel } = useMutation(options.sessions.setModel(session.id));

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
