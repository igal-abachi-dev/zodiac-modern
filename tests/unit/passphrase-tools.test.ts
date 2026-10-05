import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
const run = (script: string, ...args: string[]) =>
  spawnSync(
    'powershell.exe',
    ['-NoProfile', '-File', resolve(script), ...args],
    { encoding: 'utf8', windowsHide: true },
  );
it('receiver verifier rejects an unsigned executable and wrong hash without executing it', () => {
  const directory = mkdtempSync(resolve('.cache/receiver-verification-'));
  try {
    const path = resolve(directory, 'synthetic-unsigned.exe');
    const bytes = Buffer.from('Synthetic nonexecutable verification fixture.');
    writeFileSync(path, bytes);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const unsigned = run(
      'scripts/verify-receiver.ps1',
      '-Path',
      path,
      '-ExpectedSHA256',
      hash,
      '-ExpectedPublisher',
      'CN=Synthetic expected publisher',
    );
    expect(unsigned.status).not.toBe(0);
    expect(unsigned.stderr).toContain(
      'signature or expected publisher mismatch',
    );
    const mismatch = run(
      'scripts/verify-receiver.ps1',
      '-Path',
      path,
      '-ExpectedSHA256',
      '0'.repeat(64),
      '-ExpectedPublisher',
      'CN=Synthetic expected publisher',
    );
    expect(mismatch.status).not.toBe(0);
    expect(mismatch.stderr).toContain('Receiver hash mismatch');
    // The installed Node executable is not a Zodiac release. If Authenticode is
    // valid, its real Subject must still fail an unrelated expected publisher.
    const nodeHash = createHash('sha256')
      .update(readFileSync(process.execPath))
      .digest('hex');
    const wrongPublisher = run(
      'scripts/verify-receiver.ps1',
      '-Path',
      process.execPath,
      '-ExpectedSHA256',
      nodeHash,
      '-ExpectedPublisher',
      'CN=Synthetic unrelated publisher',
    );
    expect(wrongPublisher.status).not.toBe(0);
    expect(wrongPublisher.stderr).toContain(
      'signature or expected publisher mismatch',
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
it('readiness helper refuses captured execution before private file access or output creation', () => {
  const result = run(
    'scripts/test-recipient-readiness.ps1',
    '-Receiver',
    'missing.exe',
    '-Key',
    'missing-key.pem',
    '-EncryptedBackup',
    'missing-backup.pem',
    '-PublicPEM',
    'missing-public.pem',
    '-Ciphertext',
    'missing.txt',
    '-Destination',
    '.cache/must-not-be-created',
    '-ExpectedFingerprint',
    'a'.repeat(64),
    '-ExpectedToken',
    'Zodiac readiness: ' + 'a'.repeat(32),
  );
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('own interactive console');
});
it('password generator proves unbiased mapping and refuses captured generation/short passwords', () => {
  const script = 'scripts/New-ZodiacPassphrase.ps1';
  expect(run(script, '-SelfTest').stdout).toContain(
    'all 94 printable ASCII indices occur exactly twice',
  );
  for (const args of [[], ['-Length', '23'], ['-Length', '129']]) {
    const result = run(script, ...args);
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('passphrase (no automatic');
  }
});
it('external full HTML verifier refuses an altered file before opening', () => {
  const root = mkdtempSync(resolve('.cache/sender-verifier-'));
  try {
    const path = `${root}/sender שלום.html`;
    const bytes = readFileSync('offline/shell.html');
    writeFileSync(path, bytes);
    const digest = createHash('sha256').update(bytes).digest('hex');
    expect(
      run('scripts/verify-sender.ps1', '-Path', path, '-ExpectedSHA256', digest)
        .status,
    ).toBe(0);
    writeFileSync(
      path,
      Buffer.concat([bytes, Buffer.from('<!-- altered -->')]),
    );
    const changed = run(
      'scripts/verify-sender.ps1',
      '-Path',
      path,
      '-ExpectedSHA256',
      digest,
    );
    expect(changed.status).not.toBe(0);
    expect(changed.stderr).toContain('Sender hash mismatch');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
it('public configuration succeeds in a fresh checkout and refuses replacing a recipient', () => {
  const root = mkdtempSync(resolve('.cache/public-config-regression-'));
  try {
    const result = run(
      'scripts/test-public-recipient-write.ps1',
      '-Root',
      root,
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('absent public folder created');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
