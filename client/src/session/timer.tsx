import { type Shared } from '@exploria/server/shared';
import { Trans, useLingui } from '@lingui/react/macro';
import { add, intervalToDuration } from 'date-fns';
import { ClockIcon, PauseIcon, PlayIcon, Trash2Icon } from 'lucide-react';

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

  const {
    hours = 0,
    minutes = 0,
    seconds = 0,
  } = intervalToDuration({
    start: timer.pausedAt ?? now,
    end: add(timer.startedAt, { minutes: timer.duration }),
  });

  const { Icon, label, action } = timer.pausedAt
    ? { Icon: PlayIcon, label: <Trans>Resume</Trans>, action: onResume }
    : { Icon: PauseIcon, label: <Trans>Pause</Trans>, action: onPause };

  return (
    <Section title={<Trans>Session timer</Trans>}>
      <div className="py-6 text-center font-mono text-2xl font-medium">
        {[hours, minutes, seconds]
          .map((value) => Math.max(0, value))
          .map((value) => String(value).padStart(2, '0'))
          .join(':')}
      </div>

      <div className="row items-center gap-2">
        <Button className="flex-1" onClick={action}>
          <Icon className="size-4" />
          {label}
        </Button>

        <Button variant="outlined" onClick={withConfirm(t`Clear the timer?`, onClear)} className="px-2!">
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </Section>
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
    <Section title={<Trans>Session timer</Trans>}>
      <div className="col items-center py-6 text-center font-mono text-2xl font-medium">
        <Button onClick={withPrompt(t`Duration (minutes):`, handleStart)}>
          <Trans>Start timer</Trans>
        </Button>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-neutral rounded-md border p-2">
      <h2 className="text-dim inline-row flex items-center gap-1 text-xs font-medium uppercase">
        <ClockIcon className="size-4" />
        <span className="leading-none">{title}</span>
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
