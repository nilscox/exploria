import { assert } from '../utils.ts';
import { users } from './schema.ts';

import type { Clock } from '../adapters/clock.ts';
import type { Generator } from '../adapters/generator.ts';
import type { Dependencies } from '../di.ts';
import type { User } from '../domain/user.ts';
import type { Database } from './database.ts';

export class UserRepository {
  private generator: Generator;
  private clock: Clock;
  private db: Database;

  constructor({ generator, clock, database }: Dependencies<'generator' | 'clock' | 'database'>) {
    this.generator = generator;
    this.clock = clock;
    this.db = database;
  }

  async create({ name, loginToken }: { name: string; loginToken: string }): Promise<User> {
    const id = this.generator.id();
    const createdAt = this.clock.now();

    const [row] = await this.db
      .insert(users)
      .values({
        id,
        name,
        loginToken,
        createdAt,
      })
      .returning();

    assert(row);

    return row;
  }

  async findByLoginToken(token: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: { loginToken: token } });

    return row ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: { id } });

    return row ?? null;
  }
}
