import { drizzle } from 'drizzle-orm/node-postgres';

import { relations } from './schema';

import type { Config } from '../di';

export class Database {
  private readonly db: ReturnType<typeof drizzle<{}, typeof relations>>;

  constructor(config: Config) {
    this.db = drizzle({
      connection: config.database.url,
      logger: config.database.debug,
      casing: 'snake_case',
      relations,
    });
  }

  get query() {
    return this.db.query;
  }

  get select() {
    return this.db.select.bind(this.db);
  }

  get insert() {
    return this.db.insert.bind(this.db);
  }

  get update() {
    return this.db.update.bind(this.db);
  }

  get delete() {
    return this.db.delete.bind(this.db);
  }

  async close() {
    await this.db.$client.end();
  }
}
