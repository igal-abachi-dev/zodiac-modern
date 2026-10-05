import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { prepareRecipient } from './prepare-recipient.mjs';
import { buildHeaders } from './build-host-headers.mjs';
import { checkArtifact } from './check-artifact.mjs';
import { checkPolicy } from './check-policy.mjs';
import { buildVercelOutput } from './build-vercel-output.mjs';
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
await buildHeaders(root);
await checkArtifact(root, mode);
await checkPolicy(root);
if (process.argv.includes('--vercel')) {
  await buildVercelOutput(root);
}
console.log(`Built ${mode} static artifact at ${root}.`);
