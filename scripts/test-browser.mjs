import { spawnSync } from 'node:child_process';
import { prepareInterop } from './interop.mjs';
await prepareInterop();
const result = spawnSync(
  process.execPath,
  ['node_modules/@playwright/test/cli.js', 'test'],
  { stdio: 'inherit', windowsHide: true },
);
process.exitCode = result.status ?? 1;
