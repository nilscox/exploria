import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const addTopics = createTool((t: Translate) => ({
  description: t('add-topics.description'),
  param: z.object({
    labels: z.array(z.string().min(1).max(64)).min(1),
  }),
  execute(session, { labels }) {
    session.addTopics(labels);

    return t('tool.result.ok');
  },
}));
