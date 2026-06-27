import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import clsx from 'clsx';

import { FieldLabel, FieldProvider } from 'src/components/field';
import { Switch } from 'src/components/switch';

import { SidebarSection } from './sidebar-section';

export function PostureSection({
  session,
  onSetPosture,
}: {
  session: Shared.Session;
  onSetPosture: (posture: string) => void;
}) {
  const isAuto = session.postureMode === 'auto';

  return (
    <SidebarSection
      title={<Trans>Stance</Trans>}
      titleEnd={
        <FieldProvider>
          <div className="row mb-2 items-center justify-between gap-2">
            <Switch
              size="small"
              checked={isAuto}
              onCheckedChange={(checked) => onSetPosture(checked ? 'auto' : session.posture)}
            />
            <FieldLabel inline className="cursor-pointer">
              Auto
            </FieldLabel>
          </div>
        </FieldProvider>
      }
    >
      <div className="col gap-1.5">
        {(['socratic', 'devils_advocate', 'examiner', 'advisor', 'mirror'] as const).map((posture) => (
          <PostureCard
            key={posture}
            posture={posture}
            selected={session.posture === posture}
            disabled={isAuto}
            onClick={() => onSetPosture(posture)}
          />
        ))}
      </div>
    </SidebarSection>
  );
}

function PostureCard({
  posture,
  selected,
  disabled,
  onClick,
}: {
  posture: Shared.Posture;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={selected || disabled}
      className={clsx(
        'col w-full gap-0.5 rounded-lg border bg-neutral px-3 py-2 text-start transition-colors cursor-pointer disabled:pointer-events-none',
        selected && 'border-primary bg-primary/5',
        !selected && 'hover:bg-accent/25',
        !selected && disabled && 'opacity-50',
      )}
    >
      <span className={clsx('text-sm font-semibold', selected && 'text-primary')}>
        <PostureLabel posture={posture} />
      </span>
      <span className="text-dim text-xs">
        <PostureDescription posture={posture} />
      </span>
    </button>
  );
}

export function PostureLabel({ posture }: { posture: Shared.Posture }) {
  return {
    socratic: <Trans>Socratic</Trans>,
    devils_advocate: <Trans>Devil's advocate</Trans>,
    examiner: <Trans>Examiner</Trans>,
    advisor: <Trans>Advisor</Trans>,
    mirror: <Trans>Mirror</Trans>,
  }[posture];
}

export function PostureOption({ label, description }: { label: React.ReactNode; description: React.ReactNode }) {
  return (
    <div className="col gap-0.5">
      <span>{label}</span>
      <span className="text-dim text-xs">{description}</span>
    </div>
  );
}

export function PostureDescription({ posture }: { posture: Shared.Posture }) {
  return {
    socratic: <Trans>Question to deepen thinking</Trans>,
    devils_advocate: <Trans>Attack ideas to test them</Trans>,
    examiner: <Trans>Demanding pressure, e.g. interview prep</Trans>,
    advisor: <Trans>Help structure a decision</Trans>,
    mirror: <Trans>Reflect and welcome, without challenging</Trans>,
  }[posture];
}
