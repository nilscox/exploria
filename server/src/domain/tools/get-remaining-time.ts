import z from 'zod';

import { container } from '../../di';
import { Assistant } from '../assistant';
import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const getRemainingTime = createTool((t: Translate) => ({
  description: t('get-remaining-time.description'),
  param: z.object({}),
  execute(session) {
    return Assistant.formatTimerInfo(container.resolve('clock'), session, t);
  },
}));
