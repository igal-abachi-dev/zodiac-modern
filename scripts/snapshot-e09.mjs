// Nonsecret author-run evidence only; not an independent review/release verdict.
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve, relative, join, sep } from 'node:path';
import {
  sha256,
  verifyManifest,
  validateEntryName,
} from './release-manifest.mjs';

const root = resolve(process.argv[2] ?? '');
const releases = resolve('artifacts/releases') + sep;
if (!root.startsWith(releases) || (await lstat(root)).isSymbolicLink())
  throw Error(
    'Select an ordinary generated candidate under artifacts/releases.',
  );
const parse = async (path) => JSON.parse(await readFile(path, 'utf8'));
const manifest = await parse(join(root, 'bundle/manifest.json'));
await verifyManifest(join(root, 'bundle'), manifest);
const check = await parse(join(root, 'candidate-check.json'));
validateEntryName(check.zip.name);
if (check.zip.name.includes('/') || !check.zip.name.endsWith('.zip'))
  throw Error('Candidate check must identify a local ZIP filename.');
if (sha256(await readFile(join(root, check.zip.name))) !== check.zip.sha256)
  throw Error('Candidate ZIP no longer matches its check receipt.');
const chromeReport = await parse('artifacts/en04/browser-results.json');
const chrome = [];
const chromeTests = [];
function visit(suite) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests ?? []) {
      if (test.projectName !== 'stable-chrome') continue;
      const last = test.results.at(-1);
      chromeTests.push({ title: spec.title, status: last?.status });
      for (const attachment of last?.attachments ?? [])
        if (attachment.name === 'offline-qualification' && attachment.body)
          chrome.push(
            JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8')),
          );
    }
  for (const child of suite.suites ?? []) visit(child);
}
visit(chromeReport);
const firefox = await parse('artifacts/en04/stable-firefox-results.json');
if (
  !chrome.length ||
  chromeTests.some((test) => !['passed', 'skipped'].includes(test.status)) ||
  !firefox.passed
)
  throw Error('Passing stable Chrome and Firefox receipts required.');
const inputs = {};
for (const file of [
  'scripts/New-ZodiacSigningCertificate.ps1',
  'scripts/New-ZodiacCandidateArchive.ps1',
  'scripts/release-manifest.mjs',
  'scripts/release-package.mjs',
  'scripts/test-stable-firefox.mjs',
  'tests/unit/release-manifest.test.ts',
  'tests/unit/release-archive.test.ts',
  'config/release-trust.json',
])
  inputs[file] = sha256(await readFile(file));
const evidence = {
  recorded: new Date().toISOString(),
  scope:
    'Author-run unsigned E09 candidate preparation and synthetic headless browser qualification. Not human usability, reference-device qualification, independent review, certificate provisioning or a public release.',
  candidate: relative(resolve('.'), root).replaceAll('\\', '/'),
  manifestSHA256: sha256(await readFile(join(root, 'bundle/manifest.json'))),
  candidateCheck: check,
  sameInputRepeatability: manifest.sameInputRepeatability,
  tools: manifest.tools,
  sourceHashes: inputs,
  stableChrome: { tests: chromeTests, qualification: chrome },
  stableFirefox: firefox,
  firstFirefoxAttempt: await parse(
    'artifacts/en04/e09-firefox-first-attempt.json',
  ),
  releaseStatus:
    'unsigned-unreviewed-development-candidate; mandatory gates remain open',
};
await writeFile(
  'docs/reviews/e09-candidate-evidence.json',
  JSON.stringify(evidence, null, 2) + '\n',
);
console.log(
  'Recorded checked candidate and stable-browser evidence; release gates remain open.',
);
