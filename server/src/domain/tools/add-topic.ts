import z from 'zod';

import { createTool } from './create-tool';

export const addTopic = createTool({
  description: "Met à jour le statut d'un sujet du plan",
  param: z.object({
    label: z.string().min(1).max(64),
  }),
  execute(session, { label }) {
    session.addTopic({
      label,
    });

    return `Sujet ajouté : ${label}.`;
  },
});
