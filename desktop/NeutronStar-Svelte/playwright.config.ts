import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 25000,
  use: { browserName: 'chromium', channel: 'msedge', headless: true, viewport: { width: 960, height: 640 }, trace: 'off', video: 'off', screenshot: 'off' },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4188/', reuseExistingServer: false },
});
