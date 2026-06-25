import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const clearTimer = createTool((t: Translate) => ({
  description: t('clear-timer.description'),
  param: z.object({}),
  execute(session) {
    session.clearTimer();

    return t('clear-timer.result');
  },
}));
