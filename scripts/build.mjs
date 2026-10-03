import { spawnSync } from 'node:child_process';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { prepareRecipient } from './prepare-recipient.mjs';
import { buildHeaders } from './build-host-headers.mjs';
import { checkArtifact } from './check-artifact.mjs';
const mode = process.argv[2];
if (!['production', 'custom', 'fixture'].includes(mode))
  throw new Error('Explicit build mode required.');
await prepareRecipient(mode);
const root = mode === 'fixture' ? 'artifacts/test-site' : 'dist';
const astroCLI = join(
  dirname(createRequire(import.meta.url).resolve('astro/package.json')),
  'bin',
  'astro.mjs',
);
const result = spawnSync(process.execPath, [astroCLI, 'build'], {
  stdio: 'inherit',
  windowsHide: true,
  env: { ...process.env, ZODIAC_BUILD_MODE: mode },
});
if (result.status !== 0) process.exit(result.status ?? 1);
const headers = await buildHeaders(root);
await checkArtifact(root, mode);
if (process.argv.includes('--vercel')) {
  await mkdir('.vercel/output', { recursive: true });
  await cp(root, '.vercel/output/static', {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
  await writeFile(
    '.vercel/output/config.json',
    JSON.stringify(
      {
        version: 3,
        routes: [{ src: '/(.*)', headers }, { handle: 'filesystem' }],
      },
      null,
      2,
    ),
  );
}
console.log(`Built ${mode} static artifact at ${root}.`);
