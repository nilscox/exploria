import z from 'zod';

import type { Tool } from './tool';

const param = z.object({
  id: z.string(),
  status: z.enum(['pending', 'active', 'done']),
});

export const updateTopic: Tool<typeof param> = {
  name: 'update_topic',
  description: "Met à jour le statut d'un topic du plan",
  param,
  execute(session, { id, status }) {
    const topic = session.updateTopic(id, { status });

    return `Topic mis à jour : ${topic.label} -> ${topic.status}.`;
  },
};
