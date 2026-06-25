import type z from 'zod';

import type { Translate } from '../i18n';
import type { Session } from '../session';

export type Tool<Param extends z.ZodType = z.ZodType> = {
  description: string;
  param: Param;
  execute: (session: Session, param: z.infer<Param>) => string | Promise<string>;
};

export function createTool<Param extends z.ZodType>(
  factory: (t: Translate) => {
    description: string;
    param: Param;
    execute: (session: Session, param: z.infer<Param>) => string | Promise<string>;
  },
) {
  return factory;
}
