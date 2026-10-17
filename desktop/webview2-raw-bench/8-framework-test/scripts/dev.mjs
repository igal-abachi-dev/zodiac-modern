import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const app = process.argv[2] || 'vanilla';
if (
  ![
    'vanilla',
    'svelte',
    'react',
    'vue',
    'solid',
    'lit',
    'preact',
    'alpine',
    'htmx',
  ].includes(app)
)
  throw new Error('Unknown app');
const root = resolve(import.meta.dirname, '..');
const child = spawn(
  process.execPath,
  [resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'],
  { cwd: resolve(root, 'apps', app), stdio: 'inherit', windowsHide: true },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => child.kill());
