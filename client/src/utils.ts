export type Assign<A, B> = Omit<A, keyof B> & B;

type Exact<T, U extends T> = [T] extends [U] ? U : never;

export function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('Assertion error');
  }
}

export function exhaustiveArray<Union>() {
  return <T extends readonly Union[]>(arr: Exact<Union, T[number]> extends never ? never : T) => arr;
}

export function xor(a: boolean, b: boolean) {
  return (a && !b) || (b && !a);
}
