import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import { SlidersHorizontalIcon } from 'lucide-react';

import { Field, FieldLabel } from 'src/components/field';
import { SegmentedControl } from 'src/components/segmented-control';

import { SidebarSection } from './sidebar-section';

export function SettingsSection({
  session,
  onSetIntensity,
  onSetMessageLength,
}: {
  session: Shared.Session;
  onSetIntensity: (intensity: Shared.Intensity) => void;
  onSetMessageLength: (messageLength: Shared.MessageLength) => void;
}) {
  return (
    <SidebarSection Icon={SlidersHorizontalIcon} title={<Trans>Settings</Trans>}>
      <div className="col gap-3">
        <Field>
          <FieldLabel>
            <Trans>Intensity</Trans>
          </FieldLabel>
          <SegmentedControl
            value={session.intensity}
            onChange={onSetIntensity}
            options={(['gentle', 'balanced', 'demanding'] as const).map((intensity) => ({
              value: intensity,
              label: <IntensityLabel intensity={intensity} />,
            }))}
          />
        </Field>

        <Field>
          <FieldLabel>
            <Trans>Message length</Trans>
          </FieldLabel>
          <SegmentedControl
            value={session.messageLength}
            onChange={onSetMessageLength}
            options={(['concise', 'normal', 'detailed'] as const).map((messageLength) => ({
              value: messageLength,
              label: <MessageLengthLabel messageLength={messageLength} />,
            }))}
          />
        </Field>
      </div>
    </SidebarSection>
  );
}

export function IntensityLabel({ intensity }: { intensity: Shared.Intensity }) {
  return {
    gentle: <Trans>Gentle</Trans>,
    balanced: <Trans>Balanced</Trans>,
    demanding: <Trans>Demanding</Trans>,
  }[intensity];
}

export function MessageLengthLabel({ messageLength }: { messageLength: Shared.MessageLength }) {
  return {
    concise: <Trans>Concise</Trans>,
    normal: <Trans>Normal</Trans>,
    detailed: <Trans>Detailed</Trans>,
  }[messageLength];
}
