import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['typescript', 'oxc', 'unicorn'],
  categories: {
    correctness: 'error',
  },
  options: {
    typeAware: true,
  },
  rules: {
    'typescript/consistent-type-imports': 'warn',
  },
});
