import { AsyncLocalStorage } from 'node:async_hooks';

type AiCredentials = {
  baseUrl: string;
  apiKey: string;
};

const store = new AsyncLocalStorage<AiCredentials>();

export function provideAiCredentials(credentials: AiCredentials, next: () => void) {
  store.run(credentials, next);
}

export function getAiCredentials(): AiCredentials | undefined {
  return store.getStore();
}
