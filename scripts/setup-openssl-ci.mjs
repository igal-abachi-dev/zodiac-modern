// Test tooling only: fresh extraction of the exact recorded real Windows oracles.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

if (process.platform !== 'win32')
  throw new Error('Recorded oracle provenance currently targets Windows x64.');
const cache = resolve('.cache/toolchains');
await mkdir(cache, { recursive: true });
const manifest = JSON.parse(
  await readFile('receiver/tests/fixtures/manifest.json', 'utf8'),
);
const archives = [
  {
    branch: '3.0',
    name: 'openssl30',
    url: 'https://download.firedaemon.com/FireDaemon-OpenSSL/openssl-3.0.22.zip',
    hash: '323fa7e2062b81fe5f4becd02e885b138f5cd2a262eea7dd30331f12f54d0573',
    executable: 'openssl-3.0/x64/bin/openssl.exe',
  },
  {
    branch: '3.5',
    name: 'openssl35',
    url: 'https://download.firedaemon.com/FireDaemon-OpenSSL/openssl-3.5.9.zip',
    hash: '76da391395be029b44794857b9ff380255e02a0960a98314cd3f6a6816d82696',
    executable: 'x64/bin/openssl.exe',
  },
];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const runRoot = join(cache, `ci-oracles-${randomUUID()}`);
await mkdir(runRoot);
const environment = {};
const psQuote = (value) => `'${value.replaceAll("'", "''")}'`;
for (const archive of archives) {
  const zip = join(cache, `${archive.name}.zip`);
  if (!existsSync(zip)) {
    const response = await fetch(archive.url, {
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok)
      throw new Error(
        'Pinned OpenSSL archive unavailable; oracle gate cannot be skipped.',
      );
    await writeFile(zip, Buffer.from(await response.arrayBuffer()));
  }
  if (hash(await readFile(zip)) !== archive.hash)
    throw new Error(
      'Oracle archive hash mismatch; reopen provenance evidence.',
    );
  const destination = join(runRoot, archive.name);
  // Fresh extraction covers the DLLs too. A reused executable hash alone would
  // not establish unchanged libraries. No execution-policy changes are required.
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath ${psQuote(zip)} -DestinationPath ${psQuote(destination)}`,
    ],
    { windowsHide: true, encoding: 'utf8' },
  );
  if (result.status !== 0)
    throw new Error('Authenticated oracle extraction failed.');
  const executable = join(destination, archive.executable);
  if (
    hash(await readFile(executable)) !==
    manifest.generators[archive.branch].executableSHA256
  )
    throw new Error('Oracle executable hash mismatch.');
  environment[
    archive.branch === '3.0' ? 'ZODIAC_OPENSSL30' : 'ZODIAC_OPENSSL35'
  ] = executable;
}
await writeFile(
  join(cache, 'openssl-oracle-env.json'),
  JSON.stringify(environment, null, 2) + '\n',
);
if (process.env.GITHUB_ENV)
  await appendFile(
    process.env.GITHUB_ENV,
    Object.entries(environment)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(''),
  );
console.log(
  'Both authenticated real OpenSSL oracle extractions ready. Environment: .cache/toolchains/openssl-oracle-env.json',
);
