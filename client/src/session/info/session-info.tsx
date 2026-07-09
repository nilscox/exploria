import { type Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { useMutation } from '@tanstack/react-query';
import { AlignLeftIcon, BotIcon, GaugeIcon } from 'lucide-react';

import { options } from 'src/api';
import { Field, FieldLabel } from 'src/components/field';
import { SegmentedControl } from 'src/components/segmented-control';
import { IntensityDescription, IntensityLabel, MessageLengthDescription, MessageLengthLabel } from 'src/enums';

import { ModelSelector } from '../model-selector';
import { PostureSection } from './posture';
import { SidebarSection } from './sidebar-section';
import { Timer } from './timer';
import { TopicsListSection } from './topics-list';

export function SessionInfo({ session }: { session: Shared.Session }) {
  const { mutate: setPosture } = useMutation(options.sessions.setPosture(session.id));
  const { mutate: setIntensity } = useMutation(options.sessions.setIntensity(session.id));
  const { mutate: setMessageLength } = useMutation(options.sessions.setMessageLength(session.id));
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
      <TopicsListSection topics={session.topics.filter((topic) => topic.parentId === null)} onAdd={addTopic} />
      <PostureSection session={session} onSetPosture={setPosture} />
      <IntensitySection session={session} onSetIntensity={setIntensity} />
      <MessageLengthSection session={session} onSetMessageLength={setMessageLength} />
      <ModelSelectorSection session={session} />
    </div>
  );
}

export function IntensitySection({
  session,
  onSetIntensity,
}: {
  session: Shared.Session;
  onSetIntensity: (intensity: Shared.Intensity) => void;
}) {
  return (
    <SidebarSection Icon={GaugeIcon} title={<Trans>Intensity</Trans>}>
      <Field>
        <FieldLabel className="sr-only">
          <Trans>Intensity</Trans>
        </FieldLabel>
        <SegmentedControl
          value={session.intensity}
          onChange={onSetIntensity}
          options={(['gentle', 'balanced', 'demanding'] as const).map((intensity) => ({
            value: intensity,
            label: <IntensityLabel value={intensity} />,
          }))}
        />
        <SettingDescription>
          <IntensityDescription value={session.intensity} />
        </SettingDescription>
      </Field>
    </SidebarSection>
  );
}

export function MessageLengthSection({
  session,
  onSetMessageLength,
}: {
  session: Shared.Session;
  onSetMessageLength: (messageLength: Shared.MessageLength) => void;
}) {
  return (
    <SidebarSection Icon={AlignLeftIcon} title={<Trans>Message length</Trans>}>
      <Field>
        <FieldLabel className="sr-only">
          <Trans>Message length</Trans>
        </FieldLabel>
        <SegmentedControl
          value={session.messageLength}
          onChange={onSetMessageLength}
          options={(['concise', 'normal', 'detailed'] as const).map((messageLength) => ({
            value: messageLength,
            label: <MessageLengthLabel value={messageLength} />,
          }))}
        />
        <SettingDescription>
          <MessageLengthDescription value={session.messageLength} />
        </SettingDescription>
      </Field>
    </SidebarSection>
  );
}

function SettingDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-dim mt-1 text-xs">{children}</p>;
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
