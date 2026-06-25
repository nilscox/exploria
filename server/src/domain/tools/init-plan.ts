import z from 'zod';

import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const initPlan = createTool((t: Translate) => ({
  description: t('init-plan.description'),
  param: z.object({
    subject: z.string().describe(t('init-plan.subject-param')),
    topics: z.array(z.string().min(1).max(64)).describe(t('init-plan.topics-param')),
  }),
  execute(session, { subject, topics }) {
    session.initializePlan(
      subject,
      topics.map((label) => ({ label })),
    );

    return t('tool.result.ok');
  },
}));
