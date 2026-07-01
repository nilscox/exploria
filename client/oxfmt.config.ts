import { defineConfig } from 'oxfmt';

import baseConfig from '../oxfmt.config.ts';

export default defineConfig({
  ...baseConfig,
  ignorePatterns: ['src/i18n/*/messages.ts'],
  sortImports: {
    internalPattern: ['src/'],
  },
  sortTailwindcss: true,
});
