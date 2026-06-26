/**
 * Playwright end-to-end test configuration for the TSP Simulator POC.
 *
 * Strategy:
 *   - Only Chromium is tested (Desktop Chrome). The simulator is a desktop-first
 *     visualization tool; multi-browser coverage is not needed for a POC.
 *   - The web server (`pnpm preview`) is auto-launched on port 14022 before tests
 *     run and torn down afterwards. In CI the server is not reused so each run
 *     starts from a known state; locally the existing dev server can be reused
 *     (`reuseExistingServer: !isCI`) to speed up the edit-test loop.
 *
 * CI-awareness:
 *   - `forbidOnly: isCI` — prevents accidental `.only` calls from skipping tests
 *     on the CI pipeline.
 *   - `retries: isCI ? 2 : 0` — flaky-test mitigation on CI only; locally we
 *     want failures to surface immediately.
 *   - Workers capped at 2 in CI to avoid resource contention on shared runners.
 *
 * Traces are captured only on the first retry (`trace: 'on-first-retry'`) to
 * keep the report size manageable while still providing debugging data for
 * intermittent failures.
 */
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:14022',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm preview',
    port: 14022,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
