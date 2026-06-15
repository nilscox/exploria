export type ValueOf<T> = T[keyof T];

export type Entries<T> = ValueOf<{ [K in keyof T]: [K, T[K]] }>;

// oxlint-disable-next-line typescript/no-redundant-type-constituents
export type Compute<T> = { [K in keyof T]: Compute<T[K]> } | never;

export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type EventUnionToEmitterEvents<T extends { type: string }> = {
  [Event in T as Event['type']]: [T];
};

export function assert(value: unknown, error = new Error('Assertion error')): asserts value {
  if (!value) {
    throw error;
  }
}

export function defined<T>(value: T | null | undefined, error?: Error): T {
  assert(value != null, error);
  return value;
}

export function createId() {
  return Math.random().toString(36).slice(-8);
}

export function has<T, K extends keyof T>(key: K, value: T[K]) {
  return (obj: T) => obj[key] === value;
}

export function hasId<T extends { id: string }>(value: string) {
  return (obj: T) => obj.id === value;
}
