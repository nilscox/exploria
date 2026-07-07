import assert from 'node:assert';
import { after, before, describe, it } from 'node:test';

import { StubClock } from '../adapters/clock.ts';
import { StubGenerator } from '../adapters/generator.ts';
import { createTestDatabase, type TestDatabase } from '../test-utils.ts';
import { UserRepository } from './user-repository.ts';

void describe('UserRepository', () => {
  let db: TestDatabase;
  let generator: StubGenerator;
  let clock: StubClock;
  let repository: UserRepository;

  before(async () => {
    db = await createTestDatabase();
    generator = new StubGenerator();
    clock = new StubClock();
    repository = new UserRepository(generator, clock, db);
  });

  after(async () => {
    await db.$testClient.close();
  });

  void it('creates a user and finds it by login token', async () => {
    const loginToken = generator.token();
    const user = await repository.create({ name: 'Alice', loginToken });

    assert.strictEqual(user.name, 'Alice');

    const found = await repository.findByLoginToken(loginToken);

    assert(found !== null);
    assert.strictEqual(found.id, user.id);
    assert.strictEqual(found.name, 'Alice');
  });

  void it('finds a user by id', async () => {
    const user = await repository.create({ name: 'name', loginToken: '' });

    const found = await repository.findById(user.id);

    assert(found !== null);
    assert.strictEqual(found.id, user.id);
    assert.strictEqual(found.name, 'name');
  });

  void it('returns null for unknown id', async () => {
    const found = await repository.findById('nope');

    assert.strictEqual(found, null);
  });

  void it('returns null for unknown login token', async () => {
    const found = await repository.findByLoginToken('nope');

    assert.strictEqual(found, null);
  });
});
