import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env['CI'];
// Configurable so the tests can run next to a developer's own dev server.
const port = process.env['E2E_PORT'] ?? '4321';

/** Plays the vertical slice in Chromium against the development server (debug hooks need a dev build). */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: ci ? 1 : 0,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command: `npm start -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !ci,
    timeout: 180_000,
  },
});
