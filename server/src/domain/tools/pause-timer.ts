import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const pauseTimer = createTool((t: Translate) => ({
  description: t('pause-timer.description'),
  param: z.object({}),
  execute(session) {
    session.pauseTimer();

    return t('pause-timer.result');
  },
}));
