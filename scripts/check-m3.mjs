// Author-run synthetic export evidence; actual email drafts remain a separate gate.
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = resolve('artifacts/m3');
await mkdir(root, { recursive: true });
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(result.stderr || result.stdout || 'Acceptance command failed.');
  return result.stdout;
}
run(process.execPath, ['scripts/check-m1.mjs'], { stdio: 'inherit' });
const pdf = JSON.parse(
  run(process.env.ZODIAC_PDF_PYTHON ?? 'python', ['scripts/pdf-qa.py']),
);
const key = spawnSync(
  resolve('.cache/toolchains/openssl35/x64/bin/openssl.exe'),
  [
    'pkcs8',
    '-in',
    resolve('receiver/tests/fixtures/keys/openssl-3.5-3072.pem'),
    '-passin',
    `file:${resolve('receiver/tests/fixtures/keys/synthetic-password.txt')}`,
    '-outform',
    'DER',
  ],
  { windowsHide: true },
);
if (key.status !== 0) throw Error('Synthetic PDF oracle fixture failed.');
try {
  const result = JSON.parse(
    run(resolve('artifacts/interop-oracle.exe'), [], {
      input: JSON.stringify({
        mode: 'decrypt',
        privateDER: key.stdout.toString('base64'),
        raw: pdf.raw,
      }),
    }),
  );
  if (Buffer.from(result.result, 'base64').toString() !== pdf.plaintext)
    throw Error('PDF independent Go recovery differs.');
} finally {
  key.stdout.fill(0);
}
delete pdf.raw;
delete pdf.plaintext;
pdf.independentGoRecovery =
  'Exact synthetic UTF-8 plaintext from PDF-extracted raw';
run(
  process.execPath,
  ['scripts/test-browser.mjs', 'offline', '--project=edge', '--reporter=json'],
  {
    env: {
      ...process.env,
      ZODIAC_STABLE_EDGE: '1',
      PLAYWRIGHT_JSON_OUTPUT_NAME: resolve(root, 'edge.json'),
    },
  },
);
const edge = JSON.parse(await readFile(resolve(root, 'edge.json'), 'utf8'));
if (edge.stats.unexpected || edge.stats.skipped || edge.stats.expected !== 1)
  throw Error('Stable Edge offline exports incomplete.');
const offline = await readFile(
  'artifacts/offline probe שלום/zodiac-synthetic-probe.html',
);
const evidence = {
  recorded: new Date().toISOString(),
  status: 'automated export and PDF checks passed; email-client review pending',
  milestone: 'M3 Review',
  scope:
    'Author-run synthetic evidence, not an independent audit or release approval.',
  m1EvidenceSHA256: hash(await readFile('docs/reviews/m1-evidence.json')),
  pdf,
  edge: edge.stats,
  offline: { bytes: offline.length, sha256: hash(offline) },
  clipboard: {
    chromium:
      'Native image/png write and paste; exact text write and paste; denial fallback passed.',
    firefox:
      'Native image/png write resolves; headless Windows native image paste is empty. Exact text paste and save/denial fallback pass. No image paste support claim.',
    clients: [
      {
        client: 'Gmail',
        priority: 'primary',
        status: 'actual unsent draft paste not yet observed',
      },
      {
        client: 'Outlook',
        priority: 'secondary',
        status: 'actual unsent draft paste not yet observed',
      },
    ],
  },
  boundaries: [
    'Raw .txt required by v1 receiver',
    'Generated SVG only; no SVG/XML importer',
    'Public checks are not authentication',
    'EN-04 platform/review/delivery and QA-03/signing remain separate',
  ],
};
await writeFile(
  resolve(root, 'latest.json'),
  JSON.stringify(evidence, null, 2) + '\n',
);
await writeFile(
  'docs/reviews/e06-evidence.json',
  JSON.stringify(evidence, null, 2) + '\n',
);
console.log(
  'M3 automated exports/PDF/Go/stable Edge checks passed; Gmail-primary/Outlook-secondary client paste review remains pending.',
);
