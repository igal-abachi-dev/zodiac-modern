import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { buildVercelOutput } from './build-vercel-output.mjs';
import { checkPolicy } from './check-policy.mjs';
import { filesAt } from './walk-files.mjs';

await buildVercelOutput('dist');
await writeFile(
  '.vercel/output/static/stale-synthetic-artifact.txt',
  'Synthetic stale file; must not survive regeneration.',
);
await mkdir('.vercel/output/functions/synthetic.func', { recursive: true });
await writeFile(
  '.vercel/output/functions/synthetic.func/index.js',
  'Synthetic forbidden previous output.',
);
await buildVercelOutput('dist');
for (const path of [
  '.vercel/output/functions',
  '.vercel/output/static/stale-synthetic-artifact.txt',
  '.vercel/output/static/.security-headers.json',
  '.vercel/output/static/_headers',
]) {
  let present = false;
  try {
    await access(path);
    present = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (present)
    throw Error('Stale/internal output survived Vercel regeneration.');
}
const config = JSON.parse(await readFile('.vercel/output/config.json', 'utf8'));
const headers = await checkPolicy('dist');
if (
  JSON.stringify(config.routes[0].headers) !== JSON.stringify(headers) ||
  config.routes[0].continue !== true
)
  throw Error('Vercel exact headers/filesystem continuation mismatch.');
const hashed = [];
for (const source of await filesAt('dist')) {
  const path = relative(resolve('dist'), source).replaceAll('\\', '/');
  if (['.security-headers.json', '_headers'].includes(path)) continue;
  const bytes = await readFile(source),
    copied = await readFile(`.vercel/output/static/${path}`);
  if (!bytes.equals(copied))
    throw Error('Vercel copy differs from checked artifact.');
  hashed.push({
    path,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
await mkdir('artifacts/m4', { recursive: true });
await writeFile(
  'artifacts/m4/host-output.json',
  JSON.stringify(
    {
      recorded: new Date().toISOString(),
      status: 'static prebuilt serialization/regeneration passed',
      files: hashed,
      headers,
      configSHA256: createHash('sha256')
        .update(await readFile('.vercel/output/config.json'))
        .digest('hex'),
      originVerification:
        'Not deployed; final Vercel, Cloudflare and Netlify response checks remain pending.',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Vercel exact static bytes/headers and stale-file/function removal passed; no deployment performed.',
);
