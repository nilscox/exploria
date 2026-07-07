import { lingui } from '@lingui/vite-plugin';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    VitePWA({ registerType: 'autoUpdate', manifest }),
    tsconfigPaths(),
    react(),
    babel({ plugins: ['@lingui/babel-plugin-lingui-macro'] }),
    lingui(),
    tailwindcss(),
    svgr(),
  ],
  server: {
    port: 8000,
  },
  build: {
    sourcemap: true,
  },
});
