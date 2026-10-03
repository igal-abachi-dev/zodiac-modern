import { readFileSync } from 'node:fs';
import { createPublicKey } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validatePublicPEM } from '../../scripts/public-recipient.mjs';

describe('public build recipient policy', () => {
  const pem = readFileSync(
    'receiver/tests/fixtures/keys/openssl-3.5-3072-public.pem',
    'utf8',
  );
  it('matches real fixture fingerprints independently of PEM whitespace', () => {
    const manifest = JSON.parse(
      readFileSync('receiver/tests/fixtures/manifest.json', 'utf8'),
    );
    const fixture = manifest.fixtures.find(
      (f: { filename: string }) => f.filename === 'openssl-3.5-3072.pem',
    );
    expect(validatePublicPEM(pem).fingerprint).toBe(fixture.fingerprint);
    expect(
      validatePublicPEM(` \n${pem.replaceAll('\n', '\r\n')}\t `).fingerprint,
    ).toBe(fixture.fingerprint);
  });
  it('rejects private, PKCS#1, prefixed, trailing and multiple blocks', () => {
    const pkcs1 = createPublicKey(pem).export({ type: 'pkcs1', format: 'pem' });
    for (const value of [
      pem + pem,
      'prefix\n' + pem,
      pem + 'suffix',
      pkcs1,
      readFileSync('receiver/tests/fixtures/keys/openssl-3.5-3072.pem', 'utf8'),
    ])
      expect(() => validatePublicPEM(value)).toThrow();
  });
});
