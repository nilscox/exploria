import z from 'zod';

import { createId } from '../utils';
import { createTool } from './create-tool';

export const addTopic = createTool({
  description: "Met à jour le statut d'un sujet du plan",
  param: z.object({
    label: z.string().min(1),
  }),
  execute(session, { label }) {
    session.addTopic({
      id: createId(),
      label,
    });

    return `Sujet ajouté : ${label}.`;
  },
});
