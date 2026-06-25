import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const updateTopic = createTool((t: Translate) => ({
  description: t('update-topic.description'),
  param: z.object({
    id: z.string(),
    label: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'done']).optional(),
  }),
  execute(session, { id, label, status }) {
    session.updateTopic(id, {
      label,
      status,
    });

    return t('tool.result.ok');
  },
}));
