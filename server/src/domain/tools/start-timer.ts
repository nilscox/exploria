import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const startTimer = createTool((t: Translate) => ({
  description: t('start-timer.description'),
  param: z.object({
    duration: z.number().min(1).describe(t('start-timer.duration-param')),
  }),
  execute(session, { duration }) {
    session.startTimer(duration);

    return t('start-timer.result', { duration });
  },
}));
