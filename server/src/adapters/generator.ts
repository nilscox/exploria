import { customAlphabet } from 'nanoid';

import { defined } from '../utils';

export interface Generator {
  id(): string;
}

export class NanoIdGenerator implements Generator {
  id = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);
}

export class StubGenerator implements Generator {
  public ids: string[] = [];

  constructor(ids: string[] = []) {
    this.ids = ids;
  }

  id(): string {
    return defined(this.ids.pop(), new Error('StubGenerator: No next id'));
  }
}
