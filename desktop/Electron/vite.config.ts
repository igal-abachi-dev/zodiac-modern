import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
export default defineConfig({
  base: './',
  plugins: [svelte({ compilerOptions: { css: 'external' } })],
  build: { target: 'chrome120', assetsInlineLimit: 0, sourcemap: false, cssCodeSplit: false },
});
