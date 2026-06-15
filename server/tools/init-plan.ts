import z from 'zod';

import { createId } from '../utils';

import type { Tool } from './tool';

const param = z.object({
  subject: z.string().describe('Le sujet principal de la discussion en quelques mots'),
  topics: z.array(z.string()).describe('Les différents aspects à traiter'),
});

export const initPlan: Tool<typeof param> = {
  name: 'init_plan',
  description: 'Initialise le plan de discussion avec les grandes étapes',
  param,
  execute(session, { subject, topics }) {
    session.initializePlan(
      subject,
      topics.map((label) => ({ id: createId(), label })),
    );

    return `Plan initialisé.`;
  },
};
