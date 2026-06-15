import z from 'zod';

import { createId } from '../utils';

import type { Tool } from './tool';

const param = z.object({
  label: z.string().min(1),
});

export const addTopic: Tool<typeof param> = {
  name: 'add_topic',
  description: "Met à jour le statut d'un sujet du plan",
  param,
  execute(session, { label }) {
    session.addTopic({
      id: createId(),
      label,
    });

    return `Sujet ajouté : ${label}.`;
  },
};
