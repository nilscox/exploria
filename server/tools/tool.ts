import type z from 'zod';

import type { Session } from '../session';

export type Tool<Param extends z.ZodType> = {
  name: string;
  description: string;
  param: Param;
  execute(session: Session, param: z.infer<Param>): string | Promise<string>;
};
