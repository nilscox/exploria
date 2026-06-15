import z from 'zod';

import { createTool } from './create-tool';

export const getSavedNotes = createTool({
  description: 'Récupère toutes les notes sauvegardées au cours de la session',
  param: z.object({}),
  execute(session) {
    if (session.notes.length === 0) {
      return 'Aucune note sauvegardée.';
    }

    return `Notes sauvegardées :\n${session.notes.map((note, i) => `${i + 1}. ${note.content}`).join('\n')}`;
  },
});
