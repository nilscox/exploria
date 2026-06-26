import { type Messages } from './messages';

export { languages, type Language } from './messages';

export type Translate = <K extends keyof Messages>(
  key: K,
  ...args: Messages[K] extends (p: infer P) => string ? [P] : []
) => string;
