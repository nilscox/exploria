import z from 'zod';

import type { Tool } from './tool';

const param = z.object({
  id: z.string(),
  label: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
});

export const updateTopic: Tool<typeof param> = {
  name: 'update_topic',
  description: "Met à jour le statut d'un topic du plan",
  param,
  execute(session, { id, label, status }) {
    const topic = session.updateTopic(id, {
      label,
      status,
    });

    return `Topic mis à jour : ${topic.label} -> ${topic.status}.\n\n${JSON.stringify(session.plan, null, 2)}`;
  },
};
