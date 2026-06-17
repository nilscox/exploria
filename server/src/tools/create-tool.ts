import type z from 'zod';

import type { Session } from '../domain/session';

export type Tool<Param extends z.ZodType = z.ZodType> = ReturnType<typeof createTool<Param>>;

export function createTool<Param extends z.ZodType>(tool: {
  description: string;
  param: Param;
  execute: (session: Session, param: z.infer<Param>) => string | Promise<string>;
}) {
  return tool;
}
