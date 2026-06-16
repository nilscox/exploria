import { defineConfig } from 'oxfmt';

export default defineConfig({
  printWidth: 120,
  singleQuote: true,
  sortImports: {
    internalPattern: ['^src/.+'],
    groups: [['builtin', 'external'], 'internal', ['value-parent', 'value-sibling', 'value-index'], 'unknown'],
  },
});
