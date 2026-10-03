import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { filesAt } from './build-host-headers.mjs';

export const goExecutable =
  process.env.ZODIAC_GO ??
  (existsSync('.cache/toolchains/go/go/bin/go.exe')
    ? resolve('.cache/toolchains/go/go/bin/go.exe')
    : 'go');
export const goEnv = {
  ...process.env,
  GOTOOLCHAIN: 'local',
  GOPROXY: 'off',
  GOSUMDB: 'sum.golang.org',
  GOCACHE: resolve('.cache/go-build'),
  GOMODCACHE: resolve('.cache/go-mod'),
  GOPATH: resolve('.cache/gopath'),
};
export function runGo(args, options = {}) {
  const result = spawnSync(goExecutable, args, {
    env: goEnv,
    windowsHide: true,
    encoding: 'utf8',
    ...options,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      result.stderr || result.error?.message || 'Go check failed',
    );
  return result.stdout;
}
export async function requireGo() {
  const expected = (await readFile('.go-version', 'utf8')).trim();
  if (!runGo(['version']).includes(`go${expected} `))
    throw new Error(
      `Install pinned Go ${expected}; toolchain auto-download is disabled.`,
    );
}
async function tree(root) {
  const entries = [];
  for (const file of await filesAt(root))
    entries.push([
      file.slice(root.length + 1).replaceAll('\\', '/'),
      createHash('sha256')
        .update(await readFile(file))
        .digest('hex'),
    ]);
  return JSON.stringify(entries.sort((a, b) => a[0].localeCompare(b[0])));
}
async function verify() {
  const before = await Promise.all(
    ['go.mod', 'go.sum'].map((file) => readFile(join('receiver', file))),
  );
  console.log(runGo(['-C', 'receiver', 'mod', 'verify']).trim());
  const temporary = resolve('.cache/receiver-vendor-check');
  if (
    !temporary.startsWith(resolve('.cache') + '\\') &&
    !temporary.startsWith(resolve('.cache') + '/')
  )
    throw new Error('Unsafe verification path');
  // This is disposable generated verification output confined to .cache.
  await rm(temporary, { recursive: true, force: true });
  runGo(['-C', 'receiver', 'mod', 'vendor', '-o', temporary]);
  if ((await tree(resolve('receiver/vendor'))) !== (await tree(temporary)))
    throw new Error(
      'Vendor file set, content or modules.txt differs from clean regeneration.',
    );
  const after = await Promise.all(
    ['go.mod', 'go.sum'].map((file) => readFile(join('receiver', file))),
  );
  if (before.some((bytes, i) => !bytes.equals(after[i])))
    throw new Error('Dependency verification changed module pins.');
  runGo(['-C', 'receiver', 'test', '-mod=vendor', './...']);
  await mkdir('receiver/bin', { recursive: true });
  runGo([
    '-C',
    'receiver',
    'build',
    '-mod=vendor',
    '-trimpath',
    '-o',
    'bin/zodiac-decrypt.exe',
    './cmd/zodiac-decrypt',
  ]);
  console.log(
    'Vendor full tree/modules.txt and module pins verified; offline tests/build passed.',
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  await requireGo();
  if (process.argv[2] === 'verify') await verify();
  else if (process.argv[2] === 'test')
    console.log(
      runGo([
        '-C',
        'receiver',
        'test',
        '-mod=vendor',
        '-count=1',
        '-v',
        './...',
      ]),
    );
  else if (process.argv[2] === 'build') {
    await mkdir('receiver/bin', { recursive: true });
    runGo([
      '-C',
      'receiver',
      'build',
      '-mod=vendor',
      '-trimpath',
      '-o',
      'bin/zodiac-decrypt.exe',
      './cmd/zodiac-decrypt',
    ]);
    console.log('Built unsigned development key-verification executable.');
  } else throw new Error('Expected test, verify or build.');
}
