import { add, type Duration } from 'date-fns';
import { customAlphabet } from 'nanoid';

import { assert } from './utils';

import type { Database } from './database';
import type { SessionRepository } from './database/session-repository';
import type { Events } from './events';
import type { SessionStreams } from './session-streams';

export interface Generator {
  id(): string;
}

export class NanoIdGenerator implements Generator {
  id = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);
}

export class StubGenerator implements Generator {
  public nextId = '';

  id(): string {
    return this.nextId;
  }
}

export interface DatePort {
  now(): Date;
}

export class NativeDate implements DatePort {
  now(): Date {
    return new Date();
  }
}

export class StubDate implements DatePort {
  date = new Date(0);

  advance(duration: Duration) {
    this.date = add(this.date, duration);
  }

  now(): Date {
    return this.date;
  }
}

class Container<T> {
  private instances: Partial<T> = {};

  bind<K extends keyof T>(key: K, instance: T[K]) {
    this.instances[key] = instance;
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    return this.instances[key];
  }

  resolve<K extends keyof T>(key: K): T[K] {
    const instance = this.get(key);

    assert(instance);

    return instance;
  }
}

export const di = new Container<{
  generator: Generator;
  date: DatePort;
  events: Events;
  database: Database;
  sessionRepository: SessionRepository;
  sessionStreams: SessionStreams;
}>();
