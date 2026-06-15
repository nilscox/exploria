import z from 'zod';

import { createTool } from './create-tool';

export const pauseTimer = createTool({
  description: 'Met en pause le chronomètre',
  param: z.object({}),
  execute(session) {
    session.pauseTimer();

    return `Chronomètre mis en pause.`;
  },
});
