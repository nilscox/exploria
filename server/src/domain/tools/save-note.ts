import z from 'zod';

import { createTool } from './create-tool';

export const saveNote = createTool({
  description: "Sauvegarde un élément important de la conversation (point clé, citation, insight de l'utilisateur)",
  param: z.object({
    note: z.string().min(1),
  }),
  execute(session, { note }) {
    session.addNote({
      content: note,
    });

    return `Note sauvegardée : "${note}"`;
  },
});
