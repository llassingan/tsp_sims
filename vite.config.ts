import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: '0.0.0.0',
    port: 14022,
    strictPort: false,
    allowedHosts: ['staging.mahara.web.id', 'localhost', '127.0.0.1'],
  },
  preview: {
    host: '0.0.0.0',
    port: 14022,
    strictPort: false,
    allowedHosts: ['staging.mahara.web.id', 'localhost', '127.0.0.1'],
  },
});
