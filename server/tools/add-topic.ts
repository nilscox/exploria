import z from 'zod';

import type { Tool } from './tool';

const param = z.object({
  id: z.string(),
  label: z.string().min(1),
  status: z.enum(['pending', 'active', 'done']),
});

export const addTopic: Tool<typeof param> = {
  name: 'add_topic',
  description: "Met à jour le statut d'un topic du plan",
  param,
  execute(session, topic) {
    session.addTopic(topic);

    return `Topic ajouté : ${topic.label}`;
  },
};
