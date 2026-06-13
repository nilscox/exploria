import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';

export default defineConfig({
  plugins: [server(), react(), tailwindcss()],
  server: {
    port: 8000,
  },
});

function server(): PluginOption {
  return {
    name: 'server',
    async configureServer(server) {
      const { app } = await import('./server/server');

      server.middlewares.use('/api', app);
    },
  };
}
