import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const addTopic = createTool((t: Translate) => ({
  description: t('add-topic.description'),
  param: z.object({
    label: z.string().min(1).max(64),
  }),
  execute(session, { label }) {
    session.addTopic({
      label,
    });

    return t('add-topic.result', { label });
  },
}));
