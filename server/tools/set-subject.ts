import z from 'zod';

import { createTool } from './create-tool';

export const setSubject = createTool({
  description: 'Met à jour le sujet global de la conversation',
  param: z.object({
    subject: z.string().min(1),
  }),
  execute(session, { subject }) {
    session.setSubject(subject);

    return `Sujet changé : ${subject}.`;
  },
});
