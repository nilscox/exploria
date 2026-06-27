import { type Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import { add, intervalToDuration } from 'date-fns';
import { PauseIcon, PlayIcon } from 'lucide-react';

import { Button } from 'src/components/button';
import { useNow } from 'src/hooks/use-now';

export function Timer({
  timer,
  onStart,
  onPause,
  onResume,
  onClear,
}: {
  timer: Shared.Timer | null;
  onStart: (duration: number) => void;
  onPause: () => void;
  onResume: () => void;
  onClear: () => void;
}) {
  const now = useNow();
  const { t } = useLingui();

  if (!timer) {
    return <StartTimer onStart={onStart} />;
  }

  const { formattedTime, elapsedPercent } = computeTimer(timer, now);

  const { Icon, label, action } = timer.pausedAt
    ? { Icon: PlayIcon, label: <Trans>Resume</Trans>, action: onResume }
    : { Icon: PauseIcon, label: <Trans>Pause</Trans>, action: onPause };

  return (
    <Section>
      <div className="py-4 text-center font-mono text-4xl font-bold tracking-wide">{formattedTime}</div>

      <ProgressBar percent={elapsedPercent} />

      <div className="row mt-3 gap-2">
        <Button variant="secondary" className="flex-1" onClick={action}>
          <Icon className="size-4" />
          {label}
        </Button>

        <Button variant="outlined" className="flex-1" onClick={withConfirm(t`Clear the timer?`, onClear)}>
          <Trans>Stop</Trans>
        </Button>
      </div>
    </Section>
  );
}

function computeTimer(timer: Shared.Timer, now: Date) {
  const {
    hours = 0,
    minutes = 0,
    seconds = 0,
  } = intervalToDuration({
    start: timer.pausedAt ?? now,
    end: add(timer.startedAt, { minutes: timer.duration }),
  });

  const remainingSeconds = Math.max(0, hours * 3600 + minutes * 60 + seconds);
  const totalSeconds = timer.duration * 60;
  const elapsedPercent = Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100);

  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  const formattedTime = parts
    .map((v) => Math.max(0, v))
    .map((v) => String(v).padStart(2, '0'))
    .join(':');

  return {
    formattedTime,
    elapsedPercent,
  };
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="bg-accent h-1 w-full rounded-full">
      <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

function StartTimer({ onStart }: { onStart: (duration: number) => void }) {
  const { t } = useLingui();

  const handleStart = (input: string) => {
    const duration = Number.parseInt(input);

    if (Number.isNaN(duration)) {
      alert(t`Invalid input.`);
    } else {
      onStart(duration);
    }
  };

  return (
    <Section>
      <div className="col items-center py-4">
        <Button variant="outlined" onClick={withPrompt(t`Duration (minutes):`, handleStart)}>
          <Trans>Start timer</Trans>
        </Button>
      </div>
    </Section>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-neutral rounded-md border p-4">
      <h2 className="text-dim-50 flex items-center gap-1 text-xs font-medium uppercase">
        <Trans>Session timer</Trans>
      </h2>
      {children}
    </section>
  );
}

function withPrompt(message: string, action: (input: string) => void) {
  return () => {
    const result = window.prompt(message);

    if (result !== null) {
      action(result);
    }
  };
}

function withConfirm(message: string, action: () => void) {
  return () => {
    if (window.confirm(message)) {
      action();
    }
  };
}
