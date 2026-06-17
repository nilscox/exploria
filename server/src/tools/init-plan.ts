import z from 'zod';

import { createTool } from './create-tool';

export const initPlan = createTool({
  description: 'Initialise le plan de discussion avec les grandes étapes',
  param: z.object({
    subject: z.string().describe('Le sujet principal de la discussion en quelques mots'),
    topics: z.array(z.string()).describe('Les différents aspects à traiter'),
  }),
  execute(session, { subject, topics }) {
    session.initializePlan(
      subject,
      topics.map((label) => ({ label })),
    );

    return `Plan initialisé.`;
  },
});
