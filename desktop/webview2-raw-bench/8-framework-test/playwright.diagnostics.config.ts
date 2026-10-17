import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/diagnostics', workers: 1, timeout: 25000,
  reporter: [['list'], ['json', { outputFile: '.cache/diagnostic-correctness.json' }]],
  use: { browserName: 'chromium', channel: 'msedge', headless: true,
    viewport: { width: 960, height: 640 }, trace: 'off', video: 'off' },
  webServer: { command: 'node scripts/serve.mjs --diagnostic',
    url: 'http://127.0.0.1:4178/vanilla/', reuseExistingServer: false },
});
