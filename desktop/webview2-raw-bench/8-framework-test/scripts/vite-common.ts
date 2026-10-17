import type { UserConfig, Plugin } from 'vite';
import { resolve } from 'node:path';
export function benchBuild(mode: string): UserConfig {
  return {
    base: './',
    publicDir: resolve(import.meta.dirname, '../packages/design/generated'),
    build: {
      assetsInlineLimit: 0,
      sourcemap: false,
      target: 'chrome120',
      cssCodeSplit: false,
    },
    plugins: [], // Test entry is injected below via HTML hook in the app config.
    define: { __BENCH_TEST__: JSON.stringify(mode === 'test') },
  };
}
export function testEntry(mode: string): Plugin {
  return {
    name: 'bench-correctness-only',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => {
        if (mode === 'diagnostic' || mode === 'workload-diagnostic' || mode === 'workload-diagnostic-test')
          html = html.replace('</head>', '<script type="module" src="/tests/diagnostics.ts"></script></head>');
        if (mode === 'workload' || mode === 'workload-test' || mode === 'workload-diagnostic' || mode === 'workload-diagnostic-test')
          html = html.replace('</body>', '<script type="module" src="/src/workload.ts"></script>' +
            (mode === 'workload-test' || mode === 'workload-diagnostic-test' ? '<script type="module" src="/tests/workload-self-test.ts"></script>' : '') + '</body>');
        if (mode === 'test') return [{ tag: 'script', attrs: { type: 'module', src: '/tests/self-test.ts' }, injectTo: 'head' }];
        return html;
      },
    },
  };
}
