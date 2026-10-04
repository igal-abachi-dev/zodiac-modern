import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: { chromiumSandbox: true },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ...(process.env.ZODIAC_STABLE_EDGE === '1'
      ? [
          {
            name: 'edge',
            testMatch: /offline\.spec\.ts/,
            use: { ...devices['Desktop Edge'], channel: 'msedge' },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: 'node scripts/serve-local.mjs --fixture',
      url: 'http://127.0.0.1:4321',
      reuseExistingServer: false,
    },
    {
      command: 'node scripts/serve-local.mjs',
      env: { ZODIAC_PORT: '4322' },
      url: 'http://127.0.0.1:4322',
      reuseExistingServer: false,
    },
  ],
});
