import type { Shared } from '@exploria/server/shared';
import type { I18n } from '@lingui/core';

import { exhaustiveArray } from 'src/utils';

export const languages = exhaustiveArray<Shared.Language>()(['en', 'fr']);

export function isLanguage(value: string): value is Shared.Language {
  return (languages as string[]).includes(value);
}

export function getPreferredLanguage(): Shared.Language {
  const lang = localStorage.getItem('lang') ?? navigator.language.split('-').at(0) ?? 'en';

  if (isLanguage(lang)) {
    return lang;
  }

  localStorage.setItem('lang', 'en');

  return 'en';
}

export async function setLanguage(i18n: I18n, lang: Shared.Language) {
  const { messages } = await import(`./${lang}/messages.ts`);

  i18n.load(lang, messages);
  i18n.activate(lang);

  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);
}
