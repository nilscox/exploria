import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node26',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  bundle: true,
  minify: false,
  splitting: false,
  treeshake: true,
});
