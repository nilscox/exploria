import { defineConfig } from '@lingui/cli';

import { languages } from './src/i18n/i18n';

export default defineConfig({
  sourceLocale: 'en',
  locales: languages,
  catalogs: [
    {
      path: '<rootDir>/src/i18n/{locale}/messages',
      include: ['src'],
    },
  ],
});
