// Reproducible automated foundation evidence; independent review is a separate gate.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { platform, release, cpus } from 'node:os';
import { filesAt } from './build-host-headers.mjs';
import { requireGo, goExecutable, goEnv, runGo } from './receiver.mjs';

await requireGo();
if (!process.env.ZODIAC_OPENSSL30 || !process.env.ZODIAC_OPENSSL35)
  throw new Error('Both real pinned OpenSSL oracles are mandatory.');
const directory = resolve('artifacts/rec01');
await mkdir(directory, { recursive: true });
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inputs = [
  '.go-version',
  'receiver/go.mod',
  'receiver/go.sum',
  'receiver/tests/fixtures/manifest.json',
  'scripts/receiver.mjs',
  'scripts/oracle-key-fixtures.mjs',
  'scripts/check-rec01.mjs',
  ...(await filesAt(resolve('receiver/internal'))),
  ...(await filesAt(resolve('receiver/cmd'))),
  ...(await filesAt(resolve('receiver/vendor'))),
  ...(await filesAt(resolve('receiver/tests/fixtures/keys'))),
];
const hashes = {};
for (const file of inputs)
  hashes[relative(process.cwd(), resolve(file)).replaceAll('\\', '/')] = sha256(
    await readFile(file),
  );
const report = {
  started: new Date().toISOString(),
  status: 'running',
  independentReview: 'required; automated success does not close REC-01',
  toolchain: runGo(['version']).trim(),
  node: process.version,
  system: { platform: platform(), release: release(), cpu: cpus()[0]?.model },
  fuzz: {
    targets: ['FuzzPreKDF', 'FuzzPostKDF'],
    secondsPerTarget: 30,
    workers: 2,
    timeout: '90s',
    goMemoryLimit: '256MiB',
    note: 'Go soft memory limit; input bounds and native allocation tests are separate controls.',
  },
  hashes,
  checks: [],
};
const save = () =>
  writeFile(
    resolve(directory, 'latest.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
await save();
async function check(name, executable, args, env = process.env) {
  const started = Date.now();
  const chunks = [];
  console.log(`REC-01 ${name}...`);
  const exitCode = await new Promise((accept, reject) => {
    const child = spawn(executable, args, {
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (chunk) => {
        chunks.push(chunk);
        process.stdout.write(chunk);
      });
    child.on('error', reject);
    child.on('close', accept);
  });
  const log = Buffer.concat(chunks);
  const logPath = resolve(directory, `${name}.log`);
  await writeFile(logPath, log);
  report.checks.push({
    name,
    exitCode,
    milliseconds: Date.now() - started,
    log: relative(process.cwd(), logPath).replaceAll('\\', '/'),
    sha256: sha256(log),
  });
  await save();
  if (exitCode !== 0)
    throw new Error(`REC-01 ${name} failed; see synthetic log.`);
}
try {
  await check('openssl-oracles', process.execPath, [
    'scripts/oracle-key-fixtures.mjs',
  ]);
  await check(
    'native-tests',
    goExecutable,
    ['-C', 'receiver', 'test', '-mod=vendor', '-count=1', '-v', './...'],
    goEnv,
  );
  await check('vendor-integrity', process.execPath, [
    'scripts/receiver.mjs',
    'verify',
  ]);
  for (const target of report.fuzz.targets)
    await check(
      target,
      goExecutable,
      [
        '-C',
        'receiver',
        'test',
        '-mod=vendor',
        './internal/keyfile',
        '-run=^$',
        `-fuzz=^${target}$`,
        '-fuzztime=30s',
        '-parallel=2',
        '-timeout=90s',
      ],
      { ...goEnv, GOMAXPROCS: '2', GOMEMLIMIT: '256MiB' },
    );
  // Evidence describes the exact input tree tested, including extra vendor files.
  for (const [file, hash] of Object.entries(hashes))
    if (sha256(await readFile(file)) !== hash)
      throw new Error(`Input changed during validation: ${file}`);
  report.status = 'automated checks passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  report.finished = new Date().toISOString();
  await save();
}
console.log(`${report.status}; focused independent review remains required.`);
