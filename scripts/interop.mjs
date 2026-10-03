import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { requireGo, runGo } from './receiver.mjs';
import { build } from 'esbuild';
await requireGo();
await mkdir('artifacts', { recursive: true });
runGo([
  '-C',
  'tests/interop/go',
  'build',
  '-trimpath',
  '-o',
  resolve('artifacts/interop-oracle.exe'),
  '.',
]);
await build({
  entryPoints: ['tests/browser/bridge.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  outfile: 'artifacts/test-site/_test/crypto.js',
});
const result = spawnSync(
  process.execPath,
  [
    'node_modules/@playwright/test/cli.js',
    'test',
    'tests/browser/interop.spec.ts',
  ],
  { stdio: 'inherit', windowsHide: true },
);
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  'Real browser WebCrypto / independent Go oracle checks passed. REC-01 independent review remains a separate gate.',
);
