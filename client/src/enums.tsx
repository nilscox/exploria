import { Trans } from '@lingui/react/macro';

function translateEnum<Value extends string>(values: Record<Value, React.ReactNode>) {
  return ({ value }: { value: Value }) => values[value];
}

export const IntensityLabel = translateEnum({
  gentle: <Trans>Gentle</Trans>,
  balanced: <Trans>Balanced</Trans>,
  demanding: <Trans>Demanding</Trans>,
});

export const IntensityDescription = translateEnum({
  gentle: <Trans>Accompanies, one objection at a time</Trans>,
  balanced: <Trans>Challenges where it matters</Trans>,
  demanding: <Trans>Digs relentlessly, keeps the pressure on</Trans>,
});

export const MessageLengthLabel = translateEnum({
  concise: <Trans>Concise</Trans>,
  normal: <Trans>Normal</Trans>,
  detailed: <Trans>Detailed</Trans>,
});

export const MessageLengthDescription = translateEnum({
  concise: <Trans>A few sentences</Trans>,
  normal: <Trans>Moderate length</Trans>,
  detailed: <Trans>Developed explanations</Trans>,
});
