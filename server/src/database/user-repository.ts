import { assert } from '../utils';
import { users } from './schema';

import type { Clock } from '../adapters/clock';
import type { Generator } from '../adapters/generator';
import type { User } from '../domain/user';
import type { Database } from './database';

export class UserRepository {
  private generator: Generator;
  private clock: Clock;
  private db: Database;

  constructor(generator: Generator, clock: Clock, database: Database) {
    this.generator = generator;
    this.clock = clock;
    this.db = database;
  }

  async create({ email, name, loginToken }: { email: string; name?: string; loginToken: string }): Promise<User> {
    const id = this.generator.id();
    const createdAt = this.clock.now();

    const [row] = await this.db
      .insert(users)
      .values({
        id,
        email,
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
