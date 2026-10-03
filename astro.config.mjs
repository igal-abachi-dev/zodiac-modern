// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  outDir:
    process.env.ZODIAC_BUILD_MODE === 'fixture'
      ? './artifacts/test-site'
      : './dist',
  server: { host: '127.0.0.1' },
  integrations: [svelte()],
});
