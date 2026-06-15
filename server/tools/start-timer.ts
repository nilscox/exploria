import z from 'zod';

import { createTool } from './create-tool';

export const startTimer = createTool({
  description: 'Démarre un chronomètre',
  param: z.object({
    duration: z.number().min(1).describe('Temps de la session en minutes'),
  }),
  execute(session, { duration }) {
    session.startTimer(duration);

    return `Chronomètre démarré : ${duration} minutes.`;
  },
});
