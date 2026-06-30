import { PGlite } from '@electric-sql/pglite';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { pushSchema } from 'drizzle-kit/api-postgres';
import { drizzle } from 'drizzle-orm/pglite';
import express from 'express';
import type { Server } from 'node:http';
import { promisify } from 'node:util';

import { schema } from './database';
import { assert } from './utils';

import type { Database } from './database/database';
import type { UserRepository } from './database/user-repository';

export interface TestDatabase extends Database {
  $testClient: PGlite;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = drizzle({
    client: new PGlite(),
    relations: schema.relations,
  });

  const { apply } = await pushSchema(schema, db);
  await apply();

  Object.assign(db, { $testClient: db.$client });

  return db as unknown as TestDatabase;
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

export class ServerFetcher {
  static readonly cookieSecret = 'secret';

  private app = express();
  private server?: Server;
  private cookie: string | null = null;

  constructor(userRepository: UserRepository, configure: (app: express.Router) => void) {
    this.app.use(express.json());

    this.app.use(cookieParser(ServerFetcher.cookieSecret));

    this.app.use(async (req, _res, next) => {
      const cookies: Record<string, string | undefined> = req.signedCookies;
      const uid = cookies['uid'];

      if (uid) {
        const user = await userRepository.findById(uid);

        if (user) {
          req.user = user;
        }
      }

      next();
    });

    configure(this.app);
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

  setCookie(cookie: string | null) {
    this.cookie = cookie;
  }

  fetch(endpoint: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);

    if (this.cookie) {
      headers.set('Cookie', this.cookie);
    }

    return fetch(new URL(endpoint, this.baseUrl), { ...init, headers });
  }

  async login(token: string) {
    const res = await this.fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    assert(res.ok, new Error(await res.text()));

    const cookie = ServerFetcher.extractSignedCookie(res);

    assert(cookie !== null);
    this.setCookie(cookie);
  }

  static extractSignedCookie(res: Response): string | null {
    const setCookie = res.headers.get('Set-Cookie');

    if (!setCookie) {
      return null;
    }

    const match = setCookie.match(/^uid=([^;]+)/);

    return match ? `uid=${match[1]}` : null;
  }
}
