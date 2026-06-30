import { drizzle } from 'drizzle-orm/node-postgres';

import { relations } from './schema.ts';

import type { Config } from '../adapters/config.ts';

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(config: Config) {
  return drizzle({
    connection: config.database.url,
    logger: config.database.debug,
    casing: 'snake_case',
    relations,
  });
}
