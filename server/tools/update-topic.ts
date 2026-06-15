import z from 'zod';

import { hasId } from '../utils';

import type { Tool } from './tool';

const param = z.object({
  id: z.string(),
  label: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
});

export const updateTopic: Tool<typeof param> = {
  name: 'update_topic',
  description: "Met à jour le statut d'un sujet du plan",
  param,
  execute(session, { id, label, status }) {
    session.updateTopic(id, {
      label,
      status,
    });

    const topic = session.topics.find(hasId(id));

    return `Sujet "${topic?.label}" mis à jour.`;
  },
};
