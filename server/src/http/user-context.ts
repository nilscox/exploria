import { AsyncLocalStorage } from 'async_hooks';

import type { User } from '../domain/user.ts';

const userContext = new AsyncLocalStorage<User>();

export function provideUser(user: User, next: () => void) {
  userContext.run(user, next);
}

export function getUser() {
  return userContext.getStore() ?? null;
}
