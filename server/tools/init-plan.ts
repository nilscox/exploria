import z from 'zod';

import { createId } from '../utils';

import type { Tool } from './tool';

const param = z.object({
  topics: z.array(z.string()),
});

export const initPlan: Tool<typeof param> = {
  name: 'init_plan',
  description: 'Initialise le plan de discussion avec les grandes étapes',
  param,
  execute(session, { topics }) {
    session.setPlan({
      topics: topics.map((label) => ({
        id: createId(),
        label,
        status: 'pending',
      })),
    });

    return `Plan initialisé.\n\n${JSON.stringify(session.plan, null, 2)}`;
  },
};
