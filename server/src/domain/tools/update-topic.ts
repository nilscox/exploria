import z from 'zod';

import { hasId } from '../../utils';
import { createTool } from './create-tool';

export const updateTopic = createTool({
  description: "Met à jour le statut d'un sujet du plan",
  param: z.object({
    id: z.string(),
    label: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'done']).optional(),
  }),
  execute(session, { id, label, status }) {
    session.updateTopic(id, {
      label,
      status,
    });

    const topic = session.topics.find(hasId(id));

    return `Sujet "${topic?.label}" mis à jour.`;
  },
});
