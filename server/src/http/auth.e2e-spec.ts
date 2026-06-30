import { asValue } from 'awilix';
import 'dotenv/config';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { StubAiClient } from '../adapters/ai-client';
import { StubClock } from '../adapters/clock';
import { container } from '../di';
import { ServerFetcher, createTestDatabase, type TestDatabase } from '../test-utils';

import type { Config } from '../adapters/config';
import type { UserRepository } from '../database/user-repository';

void describe('Auth', () => {
  const config: Config = {
    env: 'test',
    server: { host: '', port: 0 },
    database: { url: '', debug: false },
    openAi: { baseUrl: '', apiKey: '' },
    auth: {
      cookieSecret: ServerFetcher.cookieSecret,
      clientUrl: 'http://localhost',
    },
  };

  let db: TestDatabase;
  let app: ServerFetcher;
  let userRepository: UserRepository;
  let clock: StubClock;

  beforeEach(async () => {
    clock = new StubClock();
    db = await createTestDatabase();

    container.register({
      config: asValue(config),
      clock: asValue(clock),
      logger: asValue({ log: () => {} }),
      aiClient: asValue(new StubAiClient()),
      database: asValue(db),
    });

    userRepository = container.resolve('userRepository');

    app = new ServerFetcher(userRepository, (app) => {
      app.use('/auth', container.resolve('authController').router);
    });

    await app.before();
  });

  afterEach(async () => {
    await app.after();
    await db.$testClient.close();
  });

  async function createUser(values: Partial<Parameters<(typeof userRepository)['create']>[0]> = {}) {
    return await userRepository.create({ email: 'user@test.dev', loginToken: 'token', ...values });
  }

  void it('returns 404 from /auth/me when not authenticated', async () => {
    const res = await app.fetch('/auth/me');

    assert.strictEqual(res.status, 404);
  });

  void it('returns 401 for invalid login token', async () => {
    const res = await app.fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token' }),
    });

    assert.strictEqual(res.status, 401);
  });

  void it('logs in with valid token', async () => {
    const user = await createUser({ loginToken: 'token' });

    let res = await app.fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'token' }),
    });

    const body = (await res.json()) as { id: string; email: string };

    assert(res.ok, JSON.stringify(body));
    assert.strictEqual(body.id, user.id);
    assert.strictEqual(body.email, 'user@test.dev');

    const cookie = ServerFetcher.extractSignedCookie(res);

    assert(cookie !== null);

    app.setCookie(cookie);

    res = await app.fetch('/auth/me');
    const me = (await res.json()) as { id: string; email: string };

    assert(res.ok, JSON.stringify(me));
    assert.strictEqual(me.id, user.id);
  });

  void it('clears cookie on logout', async () => {
    await createUser({ loginToken: 'token' });
    await app.login('token');

    let res = await app.fetch('/auth/logout', { method: 'POST' });

    assert.strictEqual(res.status, 204);

    const cookie = res.headers.get('Set-Cookie');

    assert(cookie?.match(/uid=;/));
    app.setCookie(null);

    res = await app.fetch('/auth/me');

    assert.strictEqual(res.status, 404);
  });
});
