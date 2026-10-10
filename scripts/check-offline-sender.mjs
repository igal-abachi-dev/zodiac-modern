// Synthetic EN-04 candidate checks; independent release review remains separate.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { cpus, platform, release, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { checkArtifact } from './check-artifact.mjs';

const output = resolve('artifacts/en04');
await mkdir(output, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const report = {
  recorded: new Date().toISOString(),
  scope:
    'Author-run synthetic candidate integrity and external verification helper checks. No independent trust, browser compatibility or release decision established.',
  system: {
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model,
    memoryBytes: totalmem(),
    node: process.version,
  },
  checks: [],
};
const generatedPath = 'src/generated/default-recipient.ts';
const previousGenerated = await readFile(generatedPath).catch((error) => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
try {
  const start = performance.now();
  const built = spawnSync(
    process.execPath,
    ['scripts/build-offline.mjs', 'fixture'],
    { encoding: 'utf8', windowsHide: true, timeout: 60000 },
  );
  if (built.status !== 0)
    throw Error(built.stderr || 'Offline fixture build failed.');
  report.buildMilliseconds = performance.now() - start;
  const candidatePath = resolve(
    'artifacts/offline probe שלום/zodiac-synthetic-probe.html',
  );
  const bytes = await readFile(candidatePath);
  const html = bytes.toString('utf8');
  report.candidate = {
    path: candidatePath,
    bytes: bytes.length,
    sha256: hash(bytes),
  };
  const csp = html.match(
    /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/,
  )?.[1];
  if (
    !csp ||
    html.indexOf('http-equiv="Content-Security-Policy"') >
      html.indexOf('<script>')
  )
    throw Error('Missing early meta CSP.');
  for (const tag of ['script', 'style']) {
    const blocks = [
      ...html.matchAll(
        new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'g'),
      ),
    ];
    if (blocks.length !== 1)
      throw Error('Expected one embedded ' + tag + ' block.');
    const expected =
      "'sha256-" +
      createHash('sha256').update(blocks[0][1]).digest('base64') +
      "'";
    if (!csp.includes(expected))
      throw Error('Final embedded block hash mismatch.');
  }
  for (const directive of [
    "connect-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "style-src-attr 'none'",
  ]) {
    if (!csp.includes(directive))
      throw Error('Missing directive: ' + directive);
  }
  if (/unsafe-inline|unsafe-eval/.test(csp)) throw Error('Relaxed CSP.');
  if (/\b(?:src|href)=["'](?!blob:|data:|#)/.test(html))
    throw Error('External or adjacent resource reference.');
  await checkArtifact(resolve('artifacts/offline probe שלום'), 'fixture');
  report.checks.push({
    name: 'self-contained-final-block-hashes-policy-and-artifact',
    status: 'passed',
  });
  if (platform() !== 'win32')
    throw Error('External PowerShell verification tests require Windows.');
  await mkdir('.cache', { recursive: true });
  const trials = await mkdtemp(resolve('.cache/en04-hash-'));
  const ordinary = join(trials, 'synthetic sender שלום.html');
  const altered = join(trials, 'altered.html');
  await writeFile(ordinary, bytes);
  await writeFile(
    altered,
    Buffer.concat([bytes, Buffer.from('\n<!-- synthetic alteration -->\n')]),
  );
  const powershell = join(
    process.env.SystemRoot ?? 'C:/Windows',
    'System32/WindowsPowerShell/v1.0/powershell.exe',
  );
  for (const [name, path, expected, success] of [
    ['matching-html-with-spaces-and-unicode', ordinary, hash(bytes), true],
    ['altered-html', altered, hash(bytes), false],
    ['wrong-hash', ordinary, '0'.repeat(64), false],
    ['invalid-hash', ordinary, 'invalid', false],
  ]) {
    const result = spawnSync(
      powershell,
      [
        '-NoProfile',
        '-NonInteractive',
        '-File',
        resolve('scripts/verify-sender.ps1'),
        '-Path',
        path,
        '-ExpectedSHA256',
        expected,
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 15000 },
    );
    if (result.error || (result.status === 0) !== success)
      throw Error('Unexpected verification outcome: ' + name);
    report.checks.push({
      name,
      status: 'passed',
      expectedAcceptance: success,
      exitCode: result.status,
    });
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  if (previousGenerated) await writeFile(generatedPath, previousGenerated);
  else
    await unlink(generatedPath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  await writeFile(
    join(output, 'candidate-checks.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
console.log(JSON.stringify(report, null, 2));
