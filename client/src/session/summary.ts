import type { Shared } from '@exploria/server/shared';
import { useLingui } from '@lingui/react/macro';
import { useCallback } from 'react';

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Labels = {
  date: string;
  formattedDate: string;
  summary: string;
  transcript: string;
  you: string;
  assistant: string;
  keyPoints: string;
  biases: string;
  blindSpots: string;
  tensions: string;
  openQuestions: string;
  conclusion: string;
};

export function useFormatSummaryText() {
  const { t, i18n } = useLingui();

  return useCallback(
    (session: Shared.Session, summary: Shared.Summary) => {
      const labels: Labels = {
        date: t`Date`,
        formattedDate: new Intl.DateTimeFormat(i18n.locale).format(new Date()),
        summary: t`Summary`,
        transcript: t`Transcript`,
        you: t`You`,
        assistant: t`Assistant`,
        keyPoints: t`Key points`,
        biases: t`Biases`,
        blindSpots: t`Blind spots`,
        tensions: t`Tensions & contradictions`,
        openQuestions: t`Open questions`,
        conclusion: t`Conclusion`,
      };

      return formatSummaryText(labels, session, summary);
    },
    [t, i18n.locale],
  );
}

function formatSummaryText(labels: Labels, session: Shared.Session, summary: Shared.Summary): string {
  const lines: string[] = [];

  lines.push(`Exploria — ${session.subject || 'Session'}`);
  lines.push(`${labels.date}: ${labels.formattedDate}`);
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push(labels.summary.toUpperCase());
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push(summary.summary);

  if (summary.keyPoints.length > 0) {
    lines.push('');
    lines.push(labels.keyPoints);
    lines.push('─'.repeat(30));
    summary.keyPoints.forEach((point) => lines.push(`• ${point}`));
  }

  if (summary.biases.length > 0) {
    lines.push('');
    lines.push(labels.biases);
    lines.push('─'.repeat(30));
    summary.biases.forEach(({ name, explanation }) => {
      lines.push(`• ${name}`);
      lines.push(`  ${explanation}`);
    });
  }

  if (summary.blindSpots.length > 0) {
    lines.push('');
    lines.push(labels.blindSpots);
    lines.push('─'.repeat(30));
    summary.blindSpots.forEach((spot) => lines.push(`• ${spot}`));
  }

  if (summary.tensions.length > 0) {
    lines.push('');
    lines.push(labels.tensions);
    lines.push('─'.repeat(30));
    summary.tensions.forEach((tension) => lines.push(`• ${tension}`));
  }

  if (summary.openQuestions.length > 0) {
    lines.push('');
    lines.push(labels.openQuestions);
    lines.push('─'.repeat(30));
    summary.openQuestions.forEach((q) => lines.push(`• ${q}`));
  }

  if (summary.conclusion) {
    lines.push('');
    lines.push(labels.conclusion);
    lines.push('─'.repeat(30));
    lines.push(summary.conclusion);
  }

  lines.push('');
  lines.push('═'.repeat(60));
  lines.push(labels.transcript.toUpperCase());
  lines.push('═'.repeat(60));
  lines.push('');

  const messages = session.timeline.filter((item) => item.kind === 'message');

  for (const item of messages) {
    if (item.kind !== 'message') {
      continue;
    }

    const label = item.role === 'user' ? labels.you : labels.assistant;

    lines.push(`[${label}]`);
    lines.push(item.content);
    lines.push('');
  }

  return lines.join('\n');
}
