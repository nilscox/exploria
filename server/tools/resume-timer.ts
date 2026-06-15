import z from 'zod';

import { createTool } from './create-tool';

export const resumeTimer = createTool({
  description: 'Redémarre le chronomètre',
  param: z.object({}),
  execute(session) {
    session.resumeTimer();

    return `Chronomètre redémarré.`;
  },
});
