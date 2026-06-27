import type { Shared } from '@exploria/server/shared';
import { Trans } from '@lingui/react/macro';
import clsx from 'clsx';
import {
  BracesIcon,
  CircleHelpIcon,
  ClipboardListIcon,
  DownloadIcon,
  EyeOffIcon,
  MilestoneIcon,
  ShieldAlertIcon,
  StarIcon,
  SwordsIcon,
} from 'lucide-react';

import { Button } from 'src/components/button';
import { DialogActions, DialogContent, DialogHeader } from 'src/components/dialog';
import { Markdown } from 'src/components/markdown';
import { Spinner } from 'src/components/spinner';

import { downloadText, useFormatSummaryText } from './summary';

export function SessionSummaryDialog({
  session,
  summary,
  loading,
}: {
  session: Shared.Session;
  summary?: Shared.Summary;
  loading?: boolean;
}) {
  const formatSummaryText = useFormatSummaryText();

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader className="row items-center gap-2">
        <ClipboardListIcon className="size-5 shrink-0" />
        <Trans>Session summary</Trans>
      </DialogHeader>

      {loading && (
        <div className="col items-center justify-center py-16">
          <Spinner className="size-6" />
        </div>
      )}

      {summary && <SummaryContent summary={summary} />}

      <DialogActions>
        {summary && (
          <>
            <Button
              variant="ghost"
              onClick={() => downloadText(`exploria-${session.id}.txt`, formatSummaryText(session, summary))}
            >
              <DownloadIcon className="size-4" />
              <Trans>Download</Trans>
            </Button>

            <Button
              variant="ghost"
              onClick={() => downloadText(`exploria-${session.id}.json`, JSON.stringify(session, null, 2))}
            >
              <BracesIcon className="size-4" />
              <Trans>JSON</Trans>
            </Button>
          </>
        )}

        <Button variant="ghost" className="ms-auto">
          <Trans>Close</Trans>
        </Button>
      </DialogActions>
    </DialogContent>
  );
}

function SummaryContent({ summary }: { summary: Shared.Summary }) {
  return (
    <div className="col flex-1 scrollbar-thin gap-8 overflow-y-auto px-4">
      <div />
      <Markdown markdown={summary.summary} />
      <KeyPoints points={summary.keyPoints} />
      <Biases biases={summary.biases} />
      <BlindSpots spots={summary.blindSpots} />
      <Tensions tensions={summary.tensions} />
      <OpenQuestions questions={summary.openQuestions} />
      <Conclusion conclusion={summary.conclusion} />
      <div />
    </div>
  );
}

function Section({
  Icon,
  title,
  className,
  children,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <h3 className="text-dim row items-center gap-2 text-sm font-semibold tracking-wide uppercase">
        <Icon className="size-4 shrink-0" />
        <span className="leading-none">{title}</span>
      </h3>
      {children}
    </section>
  );
}

function BulletList({ className, items }: { className?: string; items: string[] }) {
  return (
    <ul className={clsx(className, 'col list-inside list-disc gap-1')}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function KeyPoints({ points }: { points: string[] }) {
  if (points.length === 0) {
    return null;
  }

  return (
    <Section Icon={StarIcon} title={<Trans>Key points</Trans>} className="col gap-2">
      <BulletList items={points} className="text-sm" />
    </Section>
  );
}

function Biases({ biases }: { biases: Shared.Summary['biases'] }) {
  if (biases.length === 0) {
    return null;
  }

  return (
    <Section Icon={ShieldAlertIcon} title={<Trans>Biases</Trans>} className="col gap-2">
      <ul className="col gap-2">
        {biases.map(({ name, explanation }, i) => (
          <li key={i} className="col gap-0.5">
            <span className="font-medium">{name}</span>
            <span className="text-dim text-sm">{explanation}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function BlindSpots({ spots }: { spots: string[] }) {
  if (spots.length === 0) {
    return null;
  }

  return (
    <Section Icon={EyeOffIcon} title={<Trans>Blind spots</Trans>} className="col gap-2">
      <BulletList items={spots} className="text-sm" />
    </Section>
  );
}

function Tensions({ tensions }: { tensions: string[] }) {
  if (tensions.length === 0) {
    return null;
  }

  return (
    <Section Icon={SwordsIcon} title={<Trans>Tensions & contradictions</Trans>} className="col gap-2">
      <BulletList items={tensions} className="text-sm" />
    </Section>
  );
}

function OpenQuestions({ questions }: { questions: string[] }) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <Section Icon={CircleHelpIcon} title={<Trans>Open questions</Trans>} className="col gap-2">
      <BulletList items={questions} className="text-sm" />
    </Section>
  );
}

function Conclusion({ conclusion }: { conclusion: string | null }) {
  if (!conclusion) {
    return null;
  }

  return (
    <Section Icon={MilestoneIcon} title={<Trans>Conclusion</Trans>} className="col gap-2">
      <Markdown markdown={conclusion} />
    </Section>
  );
}
