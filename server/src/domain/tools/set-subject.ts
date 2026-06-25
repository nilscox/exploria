import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const setSubject = createTool((t: Translate) => ({
  description: t('set-subject.description'),
  param: z.object({
    subject: z.string().min(1),
  }),
  execute(session, { subject }) {
    session.setSubject(subject);

    return t('set-subject.result', { subject });
  },
}));
