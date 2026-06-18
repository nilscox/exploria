import z from 'zod';

import { container } from '../../di';
import { Assistant } from '../assistant';
import { createTool } from './create-tool';

export const getRemainingTime = createTool({
  description: 'Récupérer le temps restant sur le chronomètre',
  param: z.object({}),
  execute(session) {
    return Assistant.formatTimerInfo(container.resolve('clock'), session);
  },
});
