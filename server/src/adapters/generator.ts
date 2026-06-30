import { customAlphabet } from 'nanoid';
import { randomBytes } from 'node:crypto';

export interface Generator {
  id(): string;
  token(): string;
}

export class NanoIdGenerator implements Generator {
  id = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

  token(): string {
    return randomBytes(24).toString('base64url');
  }
}

export class StubGenerator implements Generator {
  private idCount = 0;
  private tokenCount = 0;

  id(): string {
    return `id-${++this.idCount}`;
  }

  token(): string {
    return `token-${++this.tokenCount}`;
  }
}
