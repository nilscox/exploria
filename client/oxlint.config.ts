import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import { defineConfig } from 'oxlint';

import baseConfig from '../oxlint.config.ts';

export default defineConfig({
  extends: [baseConfig],
  plugins: ['react', 'react-perf', 'jsx-a11y'],
  jsPlugins: ['@tanstack/eslint-plugin-query'],
  rules: {
    'typescript/consistent-type-imports': 'warn',
    ...tanstackQueryPlugin.configs.recommendedStrict.rules,
  },
});
