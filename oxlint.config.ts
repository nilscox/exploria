import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['typescript', 'oxc', 'unicorn', 'react', 'react-perf', 'jsx-a11y'],
  categories: {
    correctness: 'error',
  },
  options: {
    typeAware: true,
  },
});
