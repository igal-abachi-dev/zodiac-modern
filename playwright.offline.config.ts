import { defineConfig, devices } from '@playwright/test';

// Direct file:// testing needs no local web server. Install stable browsers
// separately; do not substitute bundled engines for stable-channel evidence.
export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['offline.spec.ts', 'offline-qualification.spec.ts'],
  workers: 1,
  timeout: 90_000,
  reporter: [
    ['line'],
    ['json', { outputFile: 'artifacts/en04/browser-results.json' }],
  ],
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: { chromiumSandbox: true },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ...(process.env.ZODIAC_STABLE_CHROME === '1'
      ? [
          {
            name: 'stable-chrome',
            use: {
              ...devices['Desktop Chrome'],
              ...(process.env.ZODIAC_STABLE_CHROME_EXECUTABLE
                ? {
                    launchOptions: {
                      chromiumSandbox: true,
                      executablePath:
                        process.env.ZODIAC_STABLE_CHROME_EXECUTABLE,
                    },
                  }
                : { channel: 'chrome' }),
            },
          },
        ]
      : []),
    ...(process.env.ZODIAC_STABLE_EDGE === '1'
      ? [
          {
            name: 'stable-edge',
            use: { ...devices['Desktop Edge'], channel: 'msedge' },
          },
        ]
      : []),
  ],
});
