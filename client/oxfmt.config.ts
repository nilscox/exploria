import { defineConfig } from 'oxfmt';

import baseConfig from '../oxfmt.config.ts';

export default defineConfig({
  ...baseConfig,
  sortImports: {
    internalPattern: ['src/'],
  },
  sortTailwindcss: true,
});
