import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const saveNote = createTool((t: Translate) => ({
  description: t('save-note.description'),
  param: z.object({
    note: z.string().min(1),
  }),
  execute(session, { note }) {
    session.addNote({
      content: note,
    });

    return t('tool.result.ok');
  },
}));
