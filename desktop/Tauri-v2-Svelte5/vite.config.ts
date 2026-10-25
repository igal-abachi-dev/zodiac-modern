import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  clearScreen: false,
  base: './',
  resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) } },
  plugins: [svelte({ compilerOptions: { css: 'external' } })],
  server: {
    host: '127.0.0.1', port: 1420, strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: { target: 'chrome120', assetsInlineLimit: 0, sourcemap: false, cssCodeSplit: false },
});
