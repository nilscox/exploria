import { PGlite } from '@electric-sql/pglite';
import 'dotenv/config';
import { pushSchema } from 'drizzle-kit/api-postgres';
import { drizzle } from 'drizzle-orm/pglite';
import express from 'express';
import type { Server } from 'node:http';
import { promisify } from 'node:util';

import { schema } from './database';

import type { Database } from './database/database';

type Assign<A, B> = Omit<A, keyof B> & B;
export type TestDatabase = Assign<Database, { $client: PGlite }>;

export async function createTestDatabase() {
  const db = drizzle({
    client: new PGlite(),
    relations: schema.relations,
  } as { client: PGlite }) as unknown as TestDatabase;

  const { apply } = await pushSchema(schema, db as any);
  await apply();

  return db;
}

export async function waitFor(callback: () => unknown, { interval = 50, timeout = 1000 } = {}): Promise<void> {
  const start = Date.now();
  let lastError: unknown;

  while (Date.now() - start < timeout) {
    try {
      await callback();
      return;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw lastError;
}

export class ExpressFetcher {
  private app = express();
  private server?: Server;

  constructor(router: express.Router) {
    this.app.use(express.json());
    this.app.use(router);
  }

  get port() {
    const address = this.server?.address() as { port: number } | undefined;
    return address?.port;
  }

  get baseUrl() {
    return `http://localhost:${this.port}`;
  }

  async before() {
    return new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(0, (err) => (err ? reject(err) : resolve()));
    });
  }

  async after() {
    if (this.server) {
      await promisify(this.server.close.bind(this.server))();
    }
  }

  fetch(endpoint: string, init?: RequestInit) {
    return fetch(new URL(endpoint, this.baseUrl), init);
  }
}
