import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const setDiscussionPaths = createTool((t: Translate) => ({
  description: t('set-discussion-paths.description'),
  param: z.object({
    paths: z
      .array(
        z.object({
          label: z.string().min(1).max(64).describe(t('set-discussion-paths.label-param')),
          description: z.string().max(128).optional().describe(t('set-discussion-paths.description-param')),
        }),
      )
      .min(2)
      .max(4),
  }),
  execute(session, { paths }) {
    session.setDiscussionPaths(paths);

    return t('tool.result.ok');
  },
}));
