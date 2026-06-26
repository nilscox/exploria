import { defineConfig } from '@lingui/cli';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  catalogs: [
    {
      path: '<rootDir>/src/i18n/{locale}/messages',
      include: ['src'],
    },
  ],
});
