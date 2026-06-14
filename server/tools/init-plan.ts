import z from 'zod';

import type { Tool } from './tool';

const param = z.object({
  topics: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      status: z.enum(['pending', 'active', 'done']),
    }),
  ),
});

export const initPlan: Tool<typeof param> = {
  name: 'init_plan',
  description: 'Initialise le plan de discussion avec les grandes étapes',
  param,
  execute(session, { topics }) {
    session.setPlan({ topics });

    return 'Plan initialisé.';
  },
};
