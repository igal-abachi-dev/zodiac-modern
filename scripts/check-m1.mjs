// Author-run M1 development acceptance evidence; no release/audit assertion.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { filesAt } from './walk-files.mjs';
import { requireGo, runGo } from './receiver.mjs';

await requireGo();
const root = resolve('artifacts/m1');
await mkdir(root, { recursive: true });
const digest = (b) => createHash('sha256').update(b).digest('hex');
const receiver = JSON.parse(
  await readFile('docs/reviews/rec01-evidence.json', 'utf8'),
);
if (receiver.status !== 'automated checks passed')
  throw Error('Passing refreshed receiver evidence is required.');
for (const [file, hash] of Object.entries(receiver.hashes))
  if (digest(await readFile(file)) !== hash)
    throw Error(`Receiver evidence must be reopened: ${file}`);
const report = {
  started: new Date().toISOString(),
  status: 'running',
  scope:
    'M1 development acceptance; synthetic data only; author-run. Production identity/signing, EN-04 full delivery and QA-03 remain separate gates.',
  node: process.version,
  go: runGo(['version']).trim(),
  receiverEvidenceSHA256: digest(
    await readFile('docs/reviews/rec01-evidence.json'),
  ),
  checks: [],
  hashes: {},
};
const save = () =>
  writeFile(
    resolve(root, 'latest.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
async function check(name, args, expected = 0, env = process.env) {
  console.log(`M1 ${name}...`);
  const started = Date.now(),
    chunks = [];
  const code = await new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, {
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (b) => {
        chunks.push(b);
        process.stdout.write(b);
      });
    child.on('error', reject);
    child.on('close', accept);
  });
  const log = Buffer.concat(chunks);
  await writeFile(resolve(root, `${name}.log`), log);
  report.checks.push({
    name,
    exitCode: code,
    expectedExit: expected,
    milliseconds: Date.now() - started,
    logSHA256: digest(log),
  });
  await save();
  if (code !== expected) throw Error(`M1 ${name} failed.`);
  return log.toString('utf8');
}
const pnpm = ['.cache/bootstrap/node_modules/pnpm/bin/pnpm.mjs'];
try {
  await check('type-format', [...pnpm, 'check']);
  await check('unit', [...pnpm, 'test']);
  await check('fixture-build', [...pnpm, 'build:test']);
  await check('custom-build', [...pnpm, 'build:custom']);
  await check('offline-feasibility-probe', [...pnpm, 'spike:offline-html']);
  await check(
    'browser',
    ['scripts/test-browser.mjs', '--reporter=list,json'],
    0,
    {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_NAME: resolve(root, 'browser.json'),
    },
  );
  const browser = JSON.parse(
    await readFile(resolve(root, 'browser.json'), 'utf8'),
  );
  if (
    browser.stats.unexpected !== 0 ||
    browser.stats.skipped !== 0 ||
    browser.stats.expected < 30
  )
    throw Error('Incomplete browser acceptance.');
  report.browser = {
    ...browser.stats,
    projects: browser.config.projects.map((p) => p.name),
    versions: {},
  };
  const walk = (suites) => {
    for (const s of suites) {
      for (const spec of s.specs ?? [])
        for (const t of spec.tests ?? [])
          for (const a of t.annotations ?? [])
            if (a.type === 'browser-version')
              report.browser.versions[t.projectName] = a.description;
      walk(s.suites ?? []);
    }
  };
  walk(browser.suites);
  const production = JSON.parse(
    await readFile('config/recipient.json', 'utf8'),
  );
  const configured =
    typeof production.name === 'string' &&
    production.name.trim() &&
    typeof production.publicKey === 'string' &&
    /^[a-f0-9]{64}$/.test(production.fingerprint ?? '');
  if (configured) {
    await check('configured-production-build', [...pnpm, 'build']);
    report.production =
      'Explicit public recipient validated; review/signing remain open.';
  } else {
    const negative = await check(
      'unconfigured-production-refusal',
      [...pnpm, 'build'],
      1,
    );
    if (!/recipient|fingerprint|public key/i.test(negative))
      throw Error('Unexpected production refusal category.');
    report.production = 'Unconfigured production intentionally refused.';
  }
  const sources = [
    '.node-version',
    '.go-version',
    'package.json',
    'pnpm-lock.yaml',
    'astro.config.mjs',
    'playwright.config.ts',
    ...(await filesAt(resolve('src'))).filter(
      (p) => !p.includes(`${resolve('src/generated')}`),
    ),
    ...(await filesAt(resolve('tests'))),
    ...(await filesAt(resolve('scripts'))),
    ...(await filesAt(resolve('config'))),
    ...(await filesAt(resolve('offline'))),
    ...(await filesAt(resolve('public/keys'))),
  ];
  for (const file of sources)
    report.hashes[
      relative(process.cwd(), resolve(file)).replaceAll('\\', '/')
    ] = digest(await readFile(file));
  report.status = 'development acceptance passed';
  report.finished = new Date().toISOString();
  await save();
  await writeFile(
    'docs/reviews/m1-evidence.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    'M1 development acceptance passed. Release and integrated review remain open.',
  );
} catch (err) {
  report.status = 'failed';
  report.finished = new Date().toISOString();
  await save();
  throw err;
}
