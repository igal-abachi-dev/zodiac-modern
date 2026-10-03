import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { requireGo, runGo } from './receiver.mjs';
import { build } from 'esbuild';
export async function prepareInterop() {
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
  runGo([
    '-C',
    'receiver',
    'test',
    '-mod=vendor',
    '-c',
    '-o',
    resolve('artifacts/receiver-command-tests.exe'),
    './cmd/zodiac-decrypt',
  ]);
  runGo([
    '-C',
    'receiver',
    'build',
    '-mod=vendor',
    '-trimpath',
    '-o',
    resolve('receiver/bin/zodiac-decrypt.exe'),
    './cmd/zodiac-decrypt',
  ]);
  await build({
    entryPoints: ['tests/browser/bridge.ts'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: 'artifacts/test-site/_test/crypto.js',
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  await prepareInterop();
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
}
