import { customAlphabet } from 'nanoid';

export interface Generator {
  id(): string;
}

export class NanoIdGenerator implements Generator {
  id = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);
}

export class StubGenerator implements Generator {
  private count = 0;

  id(): string {
    return `id-${++this.count}`;
  }
}
