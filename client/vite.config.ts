import { lingui } from '@lingui/vite-plugin';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { ManifestOptions } from 'vite-plugin-pwa';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const manifest: Partial<ManifestOptions> = {
  name: 'Exploria',
  short_name: 'Exploria',
  theme_color: '#e17100',
  display: 'standalone',
  start_url: '/session',
  icons: [
    {
      src: 'pwa-64x64.png',
      sizes: '64x64',
      type: 'image/png',
    },
    {
      src: 'pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: 'pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

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
