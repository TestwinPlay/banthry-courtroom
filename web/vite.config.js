import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Two pages: index.html is the static landing page, app.html is the React app (/login, /hearing).
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'app-routes',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (/^\/(login|hearing)\/?(\?|$)/.test(req.url)) req.url = '/app.html';
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: { input: { index: resolve(__dirname, 'index.html'), app: resolve(__dirname, 'app.html') } },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:8080', ws: true },
    },
  },
});
