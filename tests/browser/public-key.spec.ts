import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createPublicKey, generateKeyPairSync } from 'node:crypto';
import { validatePublicPEM } from '../../scripts/public-recipient.mjs';

const pemFor = (der: Buffer, label = 'PUBLIC KEY') =>
  `-----BEGIN ${label}-----\n${der
    .toString('base64')
    .match(/.{1,64}/g)!
    .join('\n')}\n-----END ${label}-----\n`;
const publicFixture = (bits: number) =>
  readFileSync(
    `receiver/tests/fixtures/keys/openssl-3.5-${bits}-public.pem`,
    'utf8',
  );

test('public SPKI fingerprints agree across build and real browser for wrapping and byte bounds', async ({
  page,
}) => {
  await page.goto('/');
  await page.addScriptTag({ url: '/_test/crypto.js' });
  for (const bits of [3072, 4096]) {
    const pem = publicFixture(bits);
    const expected = validatePublicPEM(pem);
    const der = createPublicKey(pem).export({ type: 'spki', format: 'der' });
    const wrapped = `-----BEGIN PUBLIC KEY-----\n${der
      .toString('base64')
      .match(/.{1,17}/g)!
      .join('\n')}\n-----END PUBLIC KEY-----\n`;
    const boundary = ' '.repeat(16384 - pem.length) + pem;
    for (const value of [
      pem,
      ` \n${pem.replaceAll('\n', '\r\n')}\t `,
      wrapped,
      boundary,
    ]) {
      expect(validatePublicPEM(value).fingerprint).toBe(expected.fingerprint);
      const actual = await page.evaluate(async (pem) => {
        const recipient = await window.zodiacTest.importPublicKey(pem);
        const algorithm = recipient.key.algorithm as RsaHashedKeyAlgorithm;
        return {
          bits: recipient.bits,
          fingerprint: recipient.fingerprint,
          type: recipient.key.type,
          usages: recipient.key.usages,
          extractable: recipient.key.extractable,
          hash: algorithm.hash.name,
        };
      }, value);
      expect(actual).toEqual({
        bits,
        fingerprint: expected.fingerprint,
        type: 'public',
        usages: ['encrypt'],
        extractable: true,
        hash: 'SHA-256',
      });
    }
  }
});

test('real browser and build reject unsupported keys and malformed public containers without echoing input', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.addScriptTag({ url: '/_test/crypto.js' });
  const pem = publicFixture(3072);
  const publicKey = createPublicKey(pem);
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const base64 = der.toString('base64');
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padIndex = base64.indexOf('=') - 1;
  const alias =
    base64.slice(0, padIndex) +
    alphabet[alphabet.indexOf(base64[padIndex]!) + 1] +
    base64.slice(padIndex + 1);
  expect(Buffer.from(alias, 'base64')).toEqual(der); // same bytes, forbidden pad bits
  const cases: Record<string, string> = {
    duplicate: pem + pem,
    prefix: 'synthetic-prefix-marker\n' + pem,
    suffix: pem + 'synthetic-suffix-marker',
    pkcs1: publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
    encryptedPrivate: readFileSync(
      'receiver/tests/fixtures/keys/openssl-3.5-3072.pem',
      'utf8',
    ),
    privateLabel: pemFor(der, 'PRIVATE KEY'),
    certificateLabel: pemFor(der, 'CERTIFICATE'),
    trailingDER: pemFor(Buffer.concat([der, Buffer.from([0])])),
    truncatedDER: pemFor(der.subarray(0, der.length - 1)),
    malformedDER: pemFor(Buffer.from([0x30, 0x84, 0x7f, 0xff, 0xff, 0xff])),
    base64Alias: `-----BEGIN PUBLIC KEY-----\n${alias}\n-----END PUBLIC KEY-----\n`,
    base64MissingPadding: pem.replace(/=+/g, ''),
    badBase64: pem.replace('MI', 'M!'),
    pemHeaders: pem.replace('-----\n', '-----\nProc-Type: 4,ENCRYPTED\n\n'),
    bom: '\ufeff' + pem,
    nul: '\0' + pem,
    unicodeWhitespace: '\u00a0' + pem,
    tooLarge: ' '.repeat(16385 - pem.length) + pem,
    huge: 'x'.repeat(1024 * 1024),
  };
  // Only ephemeral synthetic key objects; export public halves, never private DER.
  for (const bits of [2048]) {
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: bits });
    cases[`rsa${bits}`] = publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
  }
  // Some generators round requested odd sizes. Construct public-only JWK test
  // moduli with exact adjacent bit lengths, then use native SPKI serialization.
  for (const bits of [3071, 3073, 4095]) {
    const jwk = createPublicKey(
      publicFixture(bits === 4095 ? 4096 : 3072),
    ).export({ format: 'jwk' });
    let modulus = Buffer.from(jwk.n!, 'base64url');
    if (bits === 3073) modulus = Buffer.concat([Buffer.from([1]), modulus]);
    else modulus[0] = (modulus[0]! & 0x3f) | 0x40;
    const key = createPublicKey({
      key: { ...jwk, n: modulus.toString('base64url') },
      format: 'jwk',
    });
    expect(key.asymmetricKeyDetails?.modulusLength).toBe(bits);
    cases[`rsa${bits}`] = key
      .export({ type: 'spki', format: 'pem' })
      .toString();
  }
  for (const exponent of [3, 17]) {
    const { publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 3072,
      publicExponent: exponent,
    });
    cases[`exponent${exponent}`] = publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();
  }
  const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).publicKey;
  cases.ec = ec.export({ type: 'spki', format: 'pem' }).toString();
  const pss = generateKeyPairSync('rsa-pss', {
    modulusLength: 3072,
    hashAlgorithm: 'sha256',
    mgf1HashAlgorithm: 'sha256',
  }).publicKey;
  cases.pss = pss.export({ type: 'spki', format: 'pem' }).toString();
  for (const [name, value] of Object.entries(cases)) {
    expect(() => validatePublicPEM(value), name).toThrow();
    const result = await page.evaluate(async (pem) => {
      try {
        await window.zodiacTest.importPublicKey(pem);
        return { accepted: true, message: '', name: '' };
      } catch (error) {
        return {
          accepted: false,
          message: (error as Error).message,
          name: (error as Error).name,
        };
      }
    }, value);
    expect(result.accepted, name).toBe(false);
    expect(result.name, name).toBe('PublicKeyImportError');
    expect(result.message, name).toMatch(/public.key|PUBLIC KEY|SPKI/i);
    expect(result.message, name).not.toContain('synthetic-prefix-marker');
    expect(result.message, name).not.toContain('synthetic-suffix-marker');
    expect(result.message, name).not.toContain(base64.slice(0, 32));
  }
});
