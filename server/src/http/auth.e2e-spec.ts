import 'dotenv/config';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { container } from '../di';
import { E2eTest, TestFetcher } from '../test-utils';

import type { UserRepository } from '../database/user-repository';

void describe('Auth', () => {
  let test: E2eTest;

  beforeEach(async () => {
    test = await E2eTest.create((app) => {
      app.use('/auth', container.resolve('authController').router);
    });
  });

  afterEach(() => test.cleanup());

  async function createUser(values: Partial<Parameters<UserRepository['create']>[0]> = {}) {
    return await test.users.create({ email: 'user@test.dev', loginToken: 'token', ...values });
  }

  void it('returns 404 from /auth/me when not authenticated', async () => {
    const res = await test.fetch('/auth/me');

    assert.strictEqual(res.status, 404);
  });

  void it('returns 401 for invalid login token', async () => {
    const res = await test.fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token' }),
    });

    assert.strictEqual(res.status, 401);
  });

  void it('logs in with valid token', async () => {
    const user = await createUser({ loginToken: 'token' });

    let res = await test.fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'token' }),
    });

    const body = (await res.json()) as { id: string; email: string };

    assert(res.ok, JSON.stringify(body));
    assert.strictEqual(body.id, user.id);
    assert.strictEqual(body.email, 'user@test.dev');

    const cookie = TestFetcher.extractSignedCookie(res);

    assert(cookie !== null);

    test.fetcher.setCookie(cookie);

    res = await test.fetch('/auth/me');
    const me = (await res.json()) as { id: string; email: string };

    assert(res.ok, JSON.stringify(me));
    assert.strictEqual(me.id, user.id);
  });

  void it('clears cookie on logout', async () => {
    await createUser({ loginToken: 'token' });
    await test.login('token');

    let res = await test.fetch('/auth/logout', { method: 'POST' });

    assert.strictEqual(res.status, 204);

    const cookie = res.headers.get('Set-Cookie');

    assert(cookie?.match(/uid=;/));
    test.fetcher.setCookie(null);

    res = await test.fetch('/auth/me');

    assert.strictEqual(res.status, 404);
  });
});
