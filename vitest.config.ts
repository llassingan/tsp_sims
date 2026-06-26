/**
 * Vitest test runner configuration for the TSP Simulator POC.
 *
 * Environment:
 *   - jsdom: simulates a browser DOM so React components (rendered with
 *     @testing-library/react) have `document`, `window`, and layout APIs available.
 *   - globals: true — `describe`, `it`, `expect`, `vi` are auto-available without
 *     explicit imports in every test file.
 *
 * Test discovery:
 *   - include: unit tests under `tests/unit/**` and integration tests under
 *     `tests/integration/**`, picking up both `.test.ts` and `.test.tsx` files.
 *   - exclude: E2E (Playwright) tests, `node_modules`, and `dist`.
 *
 * Coverage thresholds at 80% across all metrics (lines, functions, branches,
 * statements). The algorithm source under `src/algorithms/` is the primary
 * coverage target since correctness is critical for the simulator's output.
 * Provider `v8` is chosen over `istanbul` for faster native instrumentation.
 *
 * The `@` alias for `src/` is mirrored here so Vitest can resolve module imports
 * inside test files the same way Vite does during development.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/integration/**/*.test.ts',
    ],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
