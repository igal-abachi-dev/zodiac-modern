// Local unsigned development candidates only. This command never publishes,
// signs, deploys, reads private keys or establishes release review/trust.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { platform } from 'node:os';
import {
  sha256,
  manifestEntries,
  verifyManifest,
} from './release-manifest.mjs';
import { filesAt } from './walk-files.mjs';
import { prepareRecipient } from './prepare-recipient.mjs';
import { requireGo, runGo } from './receiver.mjs';
import { checkArtifact } from './check-artifact.mjs';
import { checkPolicy } from './check-policy.mjs';

if (process.argv.slice(2).join(' ') !== '--candidate')
  throw Error(
    'Use --candidate explicitly. Reviewed/signed public release packaging is not available.',
  );
if (platform() !== 'win32')
  throw Error('Windows candidate packaging required.');
function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 180000,
  });
  if (result.error || result.status !== 0)
    throw Error(
      result.stderr || result.error?.message || 'Candidate command failed.',
    );
  return result.stdout.trim();
}
const sourceCommit = run('git', ['rev-parse', 'HEAD']);
const dirty = Boolean(run('git', ['status', '--porcelain']));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Invalid candidate version.');
const started = new Date().toISOString();
const name = `zodiac-modern-${version}-${sourceCommit.slice(0, 12)}-candidate-${started.replace(/[-:.TZ]/g, '')}`;
await mkdir('artifacts/releases', { recursive: true });
const output = resolve('artifacts/releases', name);
await mkdir(output); // No overwrite or recursive deletion of previous candidates.
const stage = join(output, 'bundle');
await mkdir(stage);
const recipient = await prepareRecipient('production');
await requireGo();
run(process.execPath, ['scripts/build.mjs', 'production', '--vercel']);
await checkArtifact('dist', 'production');
await checkPolicy('dist');
const offlineSource =
  'artifacts/offline probe שלום/zodiac-synthetic-probe.html';
const htmlHashes = [],
  receiverHashes = [];
const htmlName = `zodiac-sender-${version}-${sourceCommit.slice(0, 12)}-candidate.html`;
for (let trial = 0; trial < 2; trial++) {
  run(process.execPath, ['scripts/build-offline.mjs', 'production']);
  const html = await readFile(offlineSource);
  htmlHashes.push(sha256(html));
  await copyFile(offlineSource, join(stage, htmlName));
  runGo([
    '-C',
    'receiver',
    'build',
    '-mod=vendor',
    '-trimpath',
    '-buildvcs=false',
    '-o',
    join(stage, 'zodiac-decrypt.exe'),
    './cmd/zodiac-decrypt',
  ]);
  receiverHashes.push(
    sha256(await readFile(join(stage, 'zodiac-decrypt.exe'))),
  );
}
if (htmlHashes[0] !== htmlHashes[1] || receiverHashes[0] !== receiverHashes[1])
  throw Error('Repeated same-input candidate builds differ.');
await checkArtifact('artifacts/offline probe שלום', 'production');
await cp('dist', join(stage, 'hosted'), {
  recursive: true,
  errorOnExist: true,
});
await cp('.vercel/output', join(stage, 'vercel-output'), {
  recursive: true,
  errorOnExist: true,
});
await copyFile('LICENSE', join(stage, 'LICENSE'));
await cp('public/licenses', join(stage, 'licenses'), { recursive: true });
await copyFile(
  'receiver/vendor/golang.org/x/term/LICENSE',
  join(stage, 'licenses/go-x-term.txt'),
);
await copyFile(
  'receiver/vendor/golang.org/x/sys/LICENSE',
  join(stage, 'licenses/go-x-sys.txt'),
);
await copyFile('scripts/verify-sender.ps1', join(stage, 'verify-sender.ps1'));
await copyFile(
  'scripts/verify-receiver.ps1',
  join(stage, 'verify-receiver.ps1'),
);
await writeFile(join(stage, 'recipient-public.pem'), recipient.pem);
const trust = JSON.parse(await readFile('config/release-trust.json', 'utf8'));
await writeFile(
  join(stage, 'READ-ME-FIRST.txt'),
  [
    'ZODIAC MODERN — UNSIGNED, UNREVIEWED DEVELOPMENT CANDIDATE',
    'Not a signed public release. No deployment or independent assessment is implied.',
    'Hosted sender, offline HTML sender and Go receiver are separate delivery paths.',
    'The receiver is Windows-only and accepts encrypted private keys locally only.',
    'Obtain a trusted full-file SHA-256 separately BEFORE opening any offline HTML.',
    'A bundled manifest or same-site hash does not independently establish trust.',
    'The unsigned receiver cannot pass the signed-release publisher check.',
    'Do not bypass OS security warnings. Review/signing/custody/platform gates remain open.',
    'No automatic history; downloaded ciphertext/plaintext/artwork files persist.',
    'Provider expiry/revocation cannot erase previously downloaded copies.',
    '',
  ].join('\n'),
);
const sourceHashes = {};
for (const directory of [
  'src',
  'offline',
  'config',
  'scripts',
  'receiver/cmd',
  'receiver/internal',
])
  for (const path of await filesAt(directory)) {
    const file = path.replaceAll('\\', '/');
    if (!file.startsWith('src/generated/'))
      sourceHashes[file] = sha256(await readFile(path));
  }
for (const file of [
  'package.json',
  'pnpm-lock.yaml',
  '.go-version',
  'receiver/go.mod',
  'receiver/go.sum',
])
  sourceHashes[file] = sha256(await readFile(file));
const gates = [
  'QA-03 independent integrated review and independently rechecked remediation',
  'QA-02 human accessibility, reference devices, novice and real provider trials',
  'QA-01 published CI (inactive template by operator choice)',
  'SEC-02.4 administrator-enforced receiver network-denial test',
  'REC-03 operator custody/backup restore and observed first-time recipient trial',
  'EN-04 reviewed final offline delivery selection and remaining native input qualification',
  'SEC-04 confirmed origin/publisher/independent verification/reporting owners',
  'REL-01 independently confirmed recipient identity/fingerprint',
  'REL-02 final-origin checks and deployment rollback',
  'REL-03 signed receiver and trusted reviewed final artifact hashes',
];
const manifest = {
  schema: 'ZODIAC-RELEASE-CANDIDATE-1',
  status: 'unsigned-unreviewed-development-candidate',
  version,
  started,
  sourceCommit,
  workingTreeDirty: dirty,
  sourceHashes,
  recipient: {
    name: recipient.name,
    bits: recipient.bits,
    fingerprint: recipient.fingerprint,
    identityVerification: 'not established by candidate packaging',
  },
  tools: {
    node: process.version,
    pnpm: pkg.packageManager,
    go: runGo(['version']).trim(),
  },
  trust,
  signing: { status: 'unsigned', publisher: null },
  sameInputRepeatability: {
    htmlHashes,
    receiverHashes,
    scope:
      'Two sequential local builds with the same inputs/cache. Not clean-room reproducibility or independent verification.',
  },
  openGates: gates,
  files: await manifestEntries(stage),
};
await writeFile(
  join(stage, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
await verifyManifest(stage, manifest);
const zip = join(output, name + '.zip');
run('powershell.exe', [
  '-NoProfile',
  '-File',
  'scripts/New-ZodiacCandidateArchive.ps1',
  '-Stage',
  stage,
  '-Destination',
  zip,
]);
await verifyManifest(stage, manifest);
const zipBytes = await readFile(zip);
const publicHashes =
  [
    `${sha256(zipBytes)}  ${name}.zip`,
    `${sha256(await readFile(join(stage, htmlName)))}  ${htmlName}`,
    `${sha256(await readFile(join(stage, 'zodiac-decrypt.exe')))}  zodiac-decrypt.exe`,
    `${sha256(await readFile(join(stage, 'manifest.json')))}  manifest.json`,
  ].join('\n') + '\n';
await writeFile(join(output, 'SHA256SUMS.txt'), publicHashes);
await writeFile(
  join(output, 'candidate-check.json'),
  JSON.stringify(
    {
      recorded: new Date().toISOString(),
      sourceCommit,
      workingTreeDirty: dirty,
      zip: {
        name: name + '.zip',
        bytes: zipBytes.length,
        sha256: sha256(zipBytes),
      },
      fileCount: (await filesAt(stage)).length,
      zipReadback: 'all entry bytes matched staged files',
      manifestVerification: 'passed',
      publicHashes,
      openGates: gates,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Prepared unsigned development candidate: ${output}\nNo signing, deployment or publishing performed.`,
);
