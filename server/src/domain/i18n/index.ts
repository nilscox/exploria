import { type Language, type Messages, messages } from './messages';

export { languages, type Language } from './messages';

export type Translate = <K extends keyof Messages>(
  key: K,
  ...args: Messages[K] extends (p: infer P) => string ? [P] : []
) => string;

export function createTranslate(lang: Language): Translate {
  const catalog = messages[lang];

  return ((key, ...args) => {
    const entry = catalog[key];

    return typeof entry === 'function' ? entry(args[0] as never) : entry;
  }) as Translate;
}
