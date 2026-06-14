import z from 'zod';

import type { Tool } from './tool';

const param = z.object({});

export const getSavedNotes: Tool<typeof param> = {
  name: 'get_saved_notes',
  description: 'Récupère toutes les notes sauvegardées au cours de la session',
  param,
  execute(session) {
    if (session.notes.length === 0) {
      return 'Aucune note sauvegardée.';
    }

    return `Notes sauvegardées :\n${session.notes.map((note, i) => `${i + 1}. ${note.content}`).join('\n')}`;
  },
};
