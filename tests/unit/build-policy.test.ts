import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { expect, it } from 'vitest';

it('build preparation fails closed on absent/mismatched/unsupported/test defaults', () => {
  mkdirSync('.cache', { recursive: true });
  const root = mkdtempSync(resolve('.cache/build-policy-'));
  mkdirSync(join(root, 'config'));
  mkdirSync(join(root, 'public/keys'), { recursive: true });
  mkdirSync(join(root, 'receiver/tests/fixtures'), { recursive: true });
  writeFileSync(
    join(root, 'receiver/tests/fixtures/manifest.json'),
    readFileSync('receiver/tests/fixtures/manifest.json'),
  );
  const script = resolve('scripts/prepare-recipient.mjs');
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      windowsHide: true,
      encoding: 'utf8',
    });
  expect(run().status).toBe(1);
  const fixture = readFileSync(
    'receiver/tests/fixtures/keys/openssl-3.5-3072-public.pem',
    'utf8',
  );
  writeFileSync(join(root, 'public/keys/default-public.pem'), fixture);
  const manifest = JSON.parse(
    readFileSync('receiver/tests/fixtures/manifest.json', 'utf8'),
  );
  const config = {
    name: 'Not a production recipient',
    publicKey: 'public/keys/default-public.pem',
    fingerprint: manifest.fixtures.find(
      (f: { filename: string }) => f.filename === 'openssl-3.5-3072.pem',
    ).fingerprint,
  };
  const set = (value: object) =>
    writeFileSync(join(root, 'config/recipient.json'), JSON.stringify(value));
  set(config);
  expect(run().stderr).toContain('Synthetic fixture');
  set({ ...config, fingerprint: '0'.repeat(64) });
  expect(run().stderr).toContain('fingerprint mismatch');
  set({ ...config, name: '' });
  expect(run().status).toBe(1);
  set({ ...config, publicKey: '../outside-public.pem' });
  expect(run().status).toBe(1);
  // Ephemeral in-memory keys only for validation. No private export or public
  // build is created; they never become a real configured recipient.
  for (const modulusLength of [2048]) {
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength });
    writeFileSync(
      join(root, 'public/keys/default-public.pem'),
      publicKey.export({ format: 'pem', type: 'spki' }),
    );
    set(config);
    expect(run().stderr).toContain('RSA-3072/4096');
  }
  const { publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 3072,
    publicExponent: 3,
  });
  writeFileSync(
    join(root, 'public/keys/default-public.pem'),
    publicKey.export({ format: 'pem', type: 'spki' }),
  );
  set(config);
  expect(run().stderr).toContain('RSA-3072/4096');
  expect(run('--custom-only').status).toBe(0);
  expect(
    readFileSync(join(root, 'src/generated/default-recipient.ts'), 'utf8'),
  ).toContain('= null;');
});
