import z from 'zod';

import { postures } from '../session';
import { createTool } from './create-tool';

import type { Translate } from '../i18n';

export const setPosture = createTool((t: Translate) => ({
  description: t('set-posture.description'),
  param: z.object({
    posture: z.enum(postures).describe(t('set-posture.posture-param')),
    reason: z.string().min(1).describe(t('set-posture.reason-param')),
  }),
  execute(session, { posture, reason }) {
    session.setPosture(posture, reason, false);

    return t('tool.result.ok');
  },
}));
