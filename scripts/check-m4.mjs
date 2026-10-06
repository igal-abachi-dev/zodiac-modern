// Author-run integrated hardening gate. Review/signing/client trials remain explicit.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { cpus, platform, release } from 'node:os';
import { gzipSync } from 'node:zlib';
import { filesAt } from './walk-files.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
await mkdir('artifacts/m4', { recursive: true });
const report = {
  started: new Date().toISOString(),
  status: 'running',
  milestone: 'M4 Review',
  scope:
    'Author-run synthetic development hardening; no integrated independent audit, signing, deployment or human client trial.',
  system: {
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model,
    node: process.version,
  },
  checks: [],
};
const save = () =>
  writeFile('artifacts/m4/latest.json', JSON.stringify(report, null, 2) + '\n');
async function check(name, args) {
  console.log(`M4 ${name}...`);
  const chunks = [],
    started = Date.now();
  const code = await new Promise((accept, reject) => {
    const child = spawn(process.execPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (bytes) => {
        chunks.push(bytes);
        process.stdout.write(bytes);
      });
    child.on('error', reject);
    child.on('close', accept);
  });
  const log = Buffer.concat(chunks);
  await writeFile(`artifacts/m4/${name}.log`, log);
  report.checks.push({
    name,
    code,
    milliseconds: Date.now() - started,
    logSHA256: hash(log),
  });
  await save();
  if (code !== 0) throw Error(`M4 ${name} failed; see its synthetic log.`);
}
try {
  const lock = hash(await readFile('pnpm-lock.yaml'));
  await check('frozen-offline-install', [
    '.cache/bootstrap/node_modules/pnpm/bin/pnpm.mjs',
    'install',
    '--offline',
    '--frozen-lockfile',
  ]);
  if (hash(await readFile('pnpm-lock.yaml')) !== lock)
    throw Error('Frozen install changed the lockfile.');
  await check('receiver-integrated-gates', ['scripts/check-rec01.mjs']);
  await check('receiver-snapshot', ['scripts/snapshot-rec01.mjs']);
  await check('full-browser-unit-build-pdf', ['scripts/check-m3.mjs']);
  await check('dependencies-provenance-notices', [
    'scripts/check-dependencies.mjs',
  ]);
  await check('static-host-output', ['scripts/check-host-output.mjs']);
  const m1 = JSON.parse(
    await readFile('docs/reviews/m1-evidence.json', 'utf8'),
  );
  for (const [file, expected] of Object.entries(m1.hashes))
    if (hash(await readFile(file)) !== expected)
      throw Error(`Covered source changed during hardening: ${file}`);
  report.sourceEvidence = {
    path: 'docs/reviews/m1-evidence.json',
    sha256: hash(await readFile('docs/reviews/m1-evidence.json')),
  };
  report.exportsEvidenceSHA256 = hash(
    await readFile('docs/reviews/e06-evidence.json'),
  );
  report.receiverEvidenceSHA256 = hash(
    await readFile('docs/reviews/rec01-evidence.json'),
  );
  report.browser = m1.browser;
  report.details = {};
  for (const name of [
    'dependencies',
    'host-output',
    'privacy-chromium',
    'privacy-firefox',
    'navigation-chromium',
    'navigation-firefox',
  ])
    report.details[name] = JSON.parse(
      await readFile(`artifacts/m4/${name}.json`, 'utf8'),
    );
  const assets = [];
  for (const file of (await filesAt('dist/_astro')).filter((file) =>
    file.endsWith('.js'),
  )) {
    const bytes = await readFile(file);
    assets.push({
      file: file.replaceAll('\\', '/'),
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
    });
  }
  const total = assets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
  if (total > 200 * 1024)
    throw Error('All static JS exceeds initial compressed JS budget.');
  report.javascript = {
    assets,
    allStaticGzipBytes: total,
    budgetBytes: 200 * 1024,
    claim:
      'Conservative sum of all static JS, including routes not initially requested; desktop only. No mobile latency or long-task qualification claimed.',
  };
  report.releaseTrust = JSON.parse(
    await readFile('config/release-trust.json', 'utf8'),
  );
  report.documentationSHA256 = {};
  for (const file of [
    '.prettierignore',
    'AGENTS.md',
    'plan.md',
    'backlog.md',
    'README.md',
    'docs/status.md',
    'docs/hardening.md',
    'docs/deployment.md',
    'docs/reviews/m4-review-packet.md',
    'docs/reviews/en04-prototype.md',
  ])
    report.documentationSHA256[file] = hash(await readFile(file));
  report.openGates = [
    'SEC-04 confirmed origin/publisher/independent release channel and operational owners; proposed zodiac-modern.vercel.app is unclaimed.',
    'QA-03 integrated independent security review, critical/high disposition and independently rechecked fixes.',
    'EN-04 stable Chrome/Firefox and headed external verification usability; final reviewed delivery selection.',
    'QA-01 required Chromium/Firefox shipping CLI coverage/complete attack matrix and published CI (workflow stays a template by user instruction); WebKit coverage is optional.',
    'QA-02 real assistive technology, recorded latency/long tasks and five novice recipients; Gmail-primary/Outlook-secondary actual draft paste.',
    'Receiver network-denial observation at OS level; source excludes network/listener imports and offline vendor checks pass.',
    'Final-origin response/privacy checks and signed receiver/reviewed sender hashes before release.',
  ];
  report.status =
    'automated hardening passed; independent review and release gates pending';
  report.finished = new Date().toISOString();
  await save();
  await writeFile(
    'docs/reviews/e07-evidence.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    'E07 automated hardening passed; E07/M4 remain Review with named external gates.',
  );
} catch (error) {
  report.status = 'failed';
  report.finished = new Date().toISOString();
  report.failure = error.message;
  await save();
  throw error;
}
