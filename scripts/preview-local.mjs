// Build a public-only immutable snapshot, then publish it to the loopback preview.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, open, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const refresh = process.argv.includes('--refresh');
if (process.argv.slice(2).some((arg) => arg !== '--refresh'))
  throw Error('Usage: pnpm preview:local or pnpm preview:refresh');
await mkdir('.cache/preview-sites', { recursive: true });
const lockPath = resolve('.cache/local-preview.lock');
const lock = await open(lockPath, 'wx').catch(() => {
  throw Error('A preview build is already running. Wait for it to finish.');
});
try {
  const code = await new Promise((accept, reject) => {
    const build = spawn(process.execPath, ['scripts/build.mjs', 'production'], {
      stdio: 'inherit',
      windowsHide: true,
    });
    build.on('error', reject);
    build.on('exit', accept);
  });
  if (code !== 0)
    throw Error('Preview build failed; existing preview retained.');
  const build = randomUUID();
  await cp(resolve('dist'), resolve('.cache/preview-sites', build), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  const next = resolve(`.cache/local-preview-${build}.json`);
  await writeFile(next, JSON.stringify({ build }) + '\n', { flag: 'wx' });
  await rename(next, resolve('.cache/local-preview.json'));
  console.log(
    'Preview refreshed: http://127.0.0.1:4324/ — reload the browser tab.',
  );
} finally {
  await lock.close();
  await unlink(lockPath);
}
if (!refresh) {
  const server = spawn(
    process.execPath,
    ['scripts/serve-local.mjs', '--preview'],
    {
      env: { ...process.env, ZODIAC_PORT: '4324' },
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => server.kill());
  server.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
}
