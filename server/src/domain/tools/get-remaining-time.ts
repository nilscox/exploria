import z from 'zod';

import { container } from '../../di';
import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const getRemainingTime = createTool((_t: Translate) => ({
  description: _t('get-remaining-time.description'),
  param: z.object({}),
  execute(session) {
    return container.resolve('i18n').render(session.language, 'timer-info', { timer: session.timer });
  },
}));
