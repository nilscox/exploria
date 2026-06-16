import { drizzle } from 'drizzle-orm/node-postgres';

import { relations } from './schema';

export * from './schema';

export type Database = typeof drizzleDatabase;

export const drizzleDatabase = drizzle({
  connection: process.env.DATABASE_URL!,
  casing: 'snake_case',
  relations,
  // logger: true,
});
