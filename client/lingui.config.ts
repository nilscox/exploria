import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'fr'],
  catalogs: [
    {
      path: '<rootDir>/src/i18n/{locale}/messages',
      include: ['src'],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
