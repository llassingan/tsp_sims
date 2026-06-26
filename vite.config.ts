/**
 * Vite build tool configuration for the TSP Simulator POC.
 *
 * Key decisions:
 * - React plugin: enables JSX transform and Fast Refresh during development.
 * - @ path alias: maps `@/` to `src/` so modules can be imported as `@/components/...`
 *   instead of fragile relative paths. Mirrors the tsconfig paths alias.
 * - Worker format 'es': outputs Web Workers as ES modules so the browser can load
 *   algorithm workers (e.g. `algorithm.worker.ts`) without a separate bundler pass.
 * - Build target es2022: modern baseline that drops legacy polyfills; all algorithms
 *   run in workers that expect ES2022+ runtime.
 * - Sourcemaps enabled: needed for debugging production bundles on the staging deploy.
 * - Server on port 14022 with `allowedHosts`: the staging domain
 *   (`staging.mahara.web.id`) is explicitly allowed so the dev/preview server
 *   doesn't reject requests when served behind a reverse proxy.
 */
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
