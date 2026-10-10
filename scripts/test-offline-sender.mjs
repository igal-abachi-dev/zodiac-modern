import { spawnSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { prepareInterop } from './interop.mjs';

const generated = 'src/generated/default-recipient.ts';
const previous = await readFile(generated).catch((error) => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
const args = process.argv.slice(2);
const stableEdge = args.includes('--stable-edge');
const stableChrome = args.includes('--stable-chrome');
try {
  const built = spawnSync(
    process.execPath,
    ['scripts/build-offline.mjs', 'fixture'],
    { stdio: 'inherit', windowsHide: true, timeout: 60000 },
  );
  if (built.status !== 0) throw Error('Offline fixture build failed.');
  await prepareInterop();
  const result = spawnSync(
    process.execPath,
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      '--config',
      'playwright.offline.config.ts',
      ...args.filter(
        (arg) => !['--stable-edge', '--stable-chrome'].includes(arg),
      ),
    ],
    {
      stdio: 'inherit',
      windowsHide: true,
      env: {
        ...process.env,
        ...(stableEdge ? { ZODIAC_STABLE_EDGE: '1' } : {}),
        ...(stableChrome ? { ZODIAC_STABLE_CHROME: '1' } : {}),
      },
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  if (previous) await writeFile(generated, previous);
  else
    await unlink(generated).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
}
