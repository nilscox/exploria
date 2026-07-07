import { PGlite } from '@electric-sql/pglite';
import { asValue } from 'awilix';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { pushSchema } from 'drizzle-kit/api-postgres';
import { drizzle } from 'drizzle-orm/pglite';
import express from 'express';
import type { Server } from 'node:http';
import { promisify } from 'node:util';

import { StubAiClient } from './adapters/ai-client.ts';
import { StubClock } from './adapters/clock.ts';
import { StubGenerator } from './adapters/generator.ts';
import { schema } from './database/index.ts';
import { container } from './di.ts';
import { EventBus } from './event-bus.ts';
import { assert } from './utils.ts';

import type { Config } from './adapters/config.ts';
import type { Database } from './database/database.ts';
import type { SessionRepository } from './database/session-repository.ts';
import type { UserRepository } from './database/user-repository.ts';

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

export class E2eTest {
  private static readonly defaultConfig: Config = {
    env: 'test',
    server: { host: '', port: 0 },
    database: { url: '', debug: false },
    openAi: { baseUrl: '', apiKey: '' },
    tavily: { apiKey: undefined },
    auth: { cookieSecret: 'secret', clientUrl: 'http://localhost' },
    assistant: undefined,
  };

  readonly db: TestDatabase;
  readonly fetcher: TestFetcher;
  readonly clock: StubClock;
  readonly generator: StubGenerator;
  readonly aiClient: StubAiClient;

  constructor(
    db: TestDatabase,
    fetcher: TestFetcher,
    clock: StubClock,
    generator: StubGenerator,
    aiClient: StubAiClient,
  ) {
    this.db = db;
    this.fetcher = fetcher;
    this.clock = clock;
    this.generator = generator;
    this.aiClient = aiClient;
  }

  static async create(configure: (router: express.Router) => void, config: Partial<Config> = {}): Promise<E2eTest> {
    const clock = new StubClock();
    const generator = new StubGenerator();
    const aiClient = new StubAiClient();
    const db = await createTestDatabase();

    const fullConfig: Config = {
      ...E2eTest.defaultConfig,
      ...config,
    };

    container.register({
      config: asValue(fullConfig),
      clock: asValue(clock),
      generator: asValue(generator),
      logger: asValue({ log: () => {}, error: () => {} }),
      events: asValue(new EventBus({ log: () => {}, error: () => {} })),
      aiClient: asValue(aiClient),
      database: asValue(db),
    });

    const fetcher = await TestFetcher.create(fullConfig.auth.cookieSecret, configure);

    return new E2eTest(db, fetcher, clock, generator, aiClient);
  }

  async cleanup() {
    await this.fetcher.cleanup();
    await this.db.$testClient.close();
  }

  get users(): UserRepository {
    return container.resolve('userRepository');
  }

  get sessions(): SessionRepository {
    return container.resolve('sessionRepository');
  }

  readonly build = container.build.bind(container);

  fetch(endpoint: string, init?: RequestInit) {
    return this.fetcher.fetch(endpoint, init);
  }

  login(token: string) {
    return this.fetcher.login(token);
  }
}

export class TestFetcher {
  private app = express();
  private server?: Server;
  private cookie: string | null = null;

  constructor(cookieSecret: string, configure: (app: express.Router) => void) {
    this.app.use(express.json());

    this.app.use(cookieParser(cookieSecret));

    this.app.use(async (req, _res, next) => {
      const userRepository = container.resolve('userRepository');

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

  static async create(cookieSecret: string, configure: (app: express.Router) => void): Promise<TestFetcher> {
    const fetcher = new TestFetcher(cookieSecret, configure);

    await fetcher.start();

    return fetcher;
  }

  get port() {
    const address = this.server?.address() as { port: number } | undefined;
    return address?.port;
  }

  get baseUrl() {
    return `http://localhost:${this.port}`;
  }

  async start() {
    return new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(0, (err) => (err ? reject(err) : resolve()));
    });
  }

  async cleanup() {
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

    const cookie = TestFetcher.extractSignedCookie(res);

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
