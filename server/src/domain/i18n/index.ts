import { type Messages } from './messages.ts';

export { languages, type Language } from './messages.ts';

export type Translate = <K extends keyof Messages>(
  key: K,
  ...args: Messages[K] extends (p: infer P) => string ? [P] : []
) => string;
