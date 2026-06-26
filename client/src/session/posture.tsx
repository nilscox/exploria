import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';

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
