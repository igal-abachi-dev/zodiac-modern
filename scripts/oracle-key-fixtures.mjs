// Real differential oracle. Accepts only repository-owned synthetic fixtures.
import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const manifest = JSON.parse(
  await readFile('receiver/tests/fixtures/manifest.json', 'utf8'),
);
const hash = (b) => createHash('sha256').update(b).digest('hex');
for (const fixture of manifest.fixtures) {
  const branch =
    fixture.filename.startsWith('openssl-3.0-') &&
    !fixture.filename.includes('rewrapped')
      ? '3.0'
      : '3.5';
  const exe =
    branch === '3.0'
      ? process.env.ZODIAC_OPENSSL30
      : process.env.ZODIAC_OPENSSL35;
  if (!exe)
    throw new Error(
      'Both isolated OpenSSL oracle executables are required; no skipped oracle gate.',
    );
  if (
    hash(await readFile(exe)) !== manifest.generators[branch].executableSHA256
  )
    throw new Error('Oracle executable changed; reopen fixture evidence.');
  const path = resolve('receiver/tests/fixtures/keys', fixture.filename);
  if (hash(await readFile(path)) !== fixture.sha256)
    throw new Error('Fixture hash mismatch.');
  const result = spawnSync(
    exe,
    [
      'pkcs8',
      '-in',
      path,
      '-passin',
      `file:${resolve('receiver/tests/fixtures/keys/synthetic-password.txt')}`,
      '-outform',
      'DER',
    ],
    { windowsHide: true },
  );
  try {
    if (result.status !== 0) throw new Error('Real OpenSSL oracle failed.');
    const publicDER = createPublicKey({
      key: result.stdout,
      format: 'der',
      type: 'pkcs1',
    }).export({ format: 'der', type: 'spki' });
    if (hash(publicDER) !== fixture.fingerprint)
      throw new Error('OpenSSL oracle public fingerprint mismatch.');
  } finally {
    result.stdout?.fill(0);
  }
  console.log(
    `${fixture.filename}: OpenSSL oracle and hashes passed; policy ${fixture.expected}`,
  );
}
