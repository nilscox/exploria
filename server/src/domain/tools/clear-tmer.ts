import z from 'zod';

import { createTool } from './create-tool';

export const clearTimer = createTool({
  description: 'Annule le chronomètre',
  param: z.object({}),
  execute(session) {
    session.clearTimer();

    return 'Chronomètre annulé.';
  },
});
