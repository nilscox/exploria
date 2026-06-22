import type { I18n } from '@lingui/core';

export type Language = 'en' | 'fr';

export function getPreferredLanguage(): Language {
  const lang = localStorage.getItem('lang') ?? navigator.language.split('-').at(0) ?? 'en';

  if (['en', 'fr'].includes(lang)) {
    return lang as Language;
  }

  localStorage.setItem('lang', 'en');

  return 'en';
}

export async function setLanguage(i18n: I18n, lang: Language) {
  const { messages } = await import(`./${lang}/messages.ts`);

  i18n.load(lang, messages);
  i18n.activate(lang);

  localStorage.setItem('lang', lang);
}
