import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { filesAt } from './walk-files.mjs';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const expected = [
  'astro',
  '@astrojs/svelte',
  'svelte',
  'typescript',
  '@lucide/svelte',
].sort();
if (
  JSON.stringify(Object.keys(manifest.dependencies).sort()) !==
  JSON.stringify(expected)
)
  throw Error(
    'Runtime dependency scope changed; review and update the explicit allowlist.',
  );
const direct = [];
for (const [name, version] of Object.entries(manifest.dependencies)) {
  const installed = JSON.parse(
    await readFile(resolve('node_modules', name, 'package.json'), 'utf8'),
  );
  if (
    installed.version !== version ||
    !/^(?:MIT|ISC|Apache-2\.0)$/.test(installed.license ?? '')
  )
    throw Error(`Unpinned or unreviewed dependency: ${name}`);
  direct.push({ name, version, license: installed.license });
}
const inputs = Object.keys(
  JSON.parse(await readFile('artifacts/offline-build-inputs.json', 'utf8'))
    .inputs,
);
const packages = new Map();
const notices = new Map();
for (const input of inputs.filter((p) => p.includes('node_modules/'))) {
  let root = dirname(resolve(input));
  while (!existsSync(join(root, 'package.json'))) {
    const parent = dirname(root);
    if (parent === root) throw Error('Bundled package provenance missing.');
    root = parent;
  }
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (
    !['svelte', '@lucide/svelte', 'clsx', 'esm-env'].includes(pkg.name) ||
    !['MIT', 'ISC'].includes(pkg.license)
  )
    throw Error(`Unreviewed shipped browser package: ${pkg.name}`);
  const licenseFile = (await readdir(root)).find((name) =>
    /^licen[cs]e(?:\.|$)/i.test(name),
  );
  if (!licenseFile) throw Error(`Missing license notice: ${pkg.name}`);
  const notice = await readFile(join(root, licenseFile));
  notices.set(
    pkg.name,
    `${pkg.name} ${pkg.version}\n${notice.toString('utf8').replace(/\r\n/g, '\n').trim()}\n`,
  );
  packages.set(pkg.name, {
    name: pkg.name,
    version: pkg.version,
    license: pkg.license,
    licenseSHA256: createHash('sha256').update(notice).digest('hex'),
  });
}
const browserNotices = [...notices.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, text]) => text)
  .join('\n');
if (process.argv.includes('--write-notices'))
  await writeFile('public/licenses/browser-runtime.txt', browserNotices);
else if (
  (await readFile('public/licenses/browser-runtime.txt', 'utf8')) !==
  browserNotices
)
  throw Error('Shipped browser license notices differ from the actual bundle.');
const receiverModule = await readFile('receiver/go.mod', 'utf8');
if (
  !/golang\.org\/x\/term/.test(receiverModule) ||
  !/golang\.org\/x\/sys/.test(receiverModule)
)
  throw Error('Receiver dependency pins absent.');
for (const path of (await filesAt('receiver')).filter(
  (p) =>
    p.endsWith('.go') && !p.endsWith('_test.go') && !/[\\/]vendor[\\/]/.test(p),
)) {
  const source = await readFile(path, 'utf8');
  if (/"(?:net(?:\/[^\"]+)?|os\/exec|github\.com\/[^\"]+)"/.test(source))
    throw Error(
      `Unexpected receiver network/subprocess/dependency surface: ${path}`,
    );
}
const evidence = {
  recorded: new Date().toISOString(),
  status: 'direct pins/licenses and shipped browser provenance passed',
  direct,
  shippedBrowser: [...packages.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  ),
  receiver:
    'Go-maintained x/term and x/sys; module/vendor/native verification is a separate mandatory gate',
  inputs: inputs.length,
};
await mkdir('artifacts/m4', { recursive: true });
await writeFile(
  'artifacts/m4/dependencies.json',
  JSON.stringify(evidence, null, 2) + '\n',
);
console.log(
  'Pinned direct dependencies and actual browser-bundle licenses/provenance passed.',
);
