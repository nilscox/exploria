export type AnyFunction = (...args: unknown[]) => unknown;

export function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('Assertion error');
  }
}
