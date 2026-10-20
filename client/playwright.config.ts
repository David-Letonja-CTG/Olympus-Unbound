import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env['CI'];
// Configurable so the tests can run next to a developer's own dev server.
const port = process.env['E2E_PORT'] ?? '4321';
/** The production build, for the installed and offline game (its service worker is off in development). */
const pwaPort = process.env['E2E_PWA_PORT'] ?? '4322';
// CI runners have no GPU, so WebGL is software-rendered there; E2E_NO_GPU=1 reproduces that locally.
const launchOptions = process.env['E2E_NO_GPU'] ? { args: ['--disable-gpu'] } : {};
// Software rendering is bound by pixels: a smaller window keeps the game responsive without a GPU.
const viewport = { width: 960, height: 540 };

/** Plays the vertical slice in Chromium against the development server (debug hooks need a dev build). */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: ci ? 1 : 0,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    viewport,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /(coop|phone|pwa)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport, launchOptions },
    },
    {
      // A phone held sideways: touch, a small landscape screen (spec: phone-play).
      name: 'phone',
      testMatch: /phone\.spec\.ts/,
      use: { ...devices['Pixel 7 landscape'], launchOptions },
    },
    {
      // The installed game, offline (spec: installable-app): a production build on its own server.
      name: 'pwa',
      testMatch: /pwa\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport,
        launchOptions,
        baseURL: `http://localhost:${pwaPort}`,
      },
    },
    {
      // A room runs two games in one browser: it plays after the other tests, alone, so neither starves the other.
      name: 'coop',
      testMatch: /coop\.spec\.ts/,
      dependencies: ['chromium'],
      use: { ...devices['Desktop Chrome'], viewport, launchOptions },
    },
  ],
  webServer: [
    {
      command: `npm start -- --port ${port}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !ci,
      timeout: 180_000,
    },
    {
      // Always a fresh build: a stale one would test an older game.
      command: `npm run build && node scripts/serve-dist.mjs ${pwaPort} --test`,
      url: `http://localhost:${pwaPort}`,
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
