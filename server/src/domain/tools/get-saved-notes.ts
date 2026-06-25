import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const getSavedNotes = createTool((t: Translate) => ({
  description: t('get-saved-notes.description'),
  param: z.object({}),
  execute(session) {
    if (session.notes.length === 0) {
      return t('get-saved-notes.empty');
    }

    const list = session.notes.map((note, i) => `${i + 1}. ${note.content}`).join('\n');

    return `${t('get-saved-notes.heading')}\n${list}`;
  },
}));
