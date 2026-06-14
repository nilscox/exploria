export type AnyFunction = (...args: unknown[]) => unknown;

export function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('Assertion error');
  }
}

export function createId() {
  return Math.random().toString(36).slice(-8);
}

export function has<T, K extends keyof T>(key: K, value: T[K]) {
  return (obj: T) => obj[key] === value;
}
