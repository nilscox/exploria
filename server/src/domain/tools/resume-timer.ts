import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const resumeTimer = createTool((t: Translate) => ({
  description: t('resume-timer.description'),
  param: z.object({}),
  execute(session) {
    session.resumeTimer();

    return t('tool.result.ok');
  },
}));
