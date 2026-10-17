import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    outDir: mode === 'test' ? 'dist-test' : 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  plugins: mode === 'test' ? [{
    name: 'native-greeting-self-test',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [{ tag: 'script', attrs: { type: 'module', src: '/tests/self-test.ts' }, injectTo: 'body' }],
    },
  }] : [],
}));
