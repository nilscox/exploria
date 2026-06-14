import z from 'zod';

import { createId } from '../utils';

import type { Tool } from './tool';

const param = z.object({
  note: z.string().min(1),
});

export const saveNote: Tool<typeof param> = {
  name: 'save_note',
  description: "Sauvegarde un élément important de la conversation (point clé, citation, insight de l'utilisateur)",
  param,
  execute(session, { note }) {
    session.addNote({
      id: createId(),
      content: note,
    });

    return `Note sauvegardée : "${note}"`;
  },
};
