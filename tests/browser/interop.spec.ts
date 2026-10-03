import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const syntheticPassword = resolve(
  'receiver/tests/fixtures/keys/synthetic-password.txt',
);
const openssl =
  process.env.ZODIAC_OPENSSL35 ??
  resolve('.cache/toolchains/openssl35/x64/bin/openssl.exe');
const oracle = resolve('artifacts/interop-oracle.exe');
const fixtures = JSON.parse(
  readFileSync('receiver/tests/fixtures/manifest.json', 'utf8'),
);

for (const bits of [3072, 4096]) {
  test(`real WebCrypto/independent Go envelope, RSA-${bits}`, async ({
    page,
  }) => {
    const remoteRequests: string[] = [];
    await page.route('**/*', async (route) => {
      if (!route.request().url().startsWith('http://127.0.0.1:4321/')) {
        remoteRequests.push(route.request().url());
        await route.abort();
      } else await route.continue();
    });
    await page.goto('/');
    await page.addScriptTag({ url: '/_test/crypto.js' });
    const pem = readFileSync(
      `receiver/tests/fixtures/keys/openssl-3.5-${bits}-public.pem`,
      'utf8',
    );
    const result = spawnSync(
      openssl,
      [
        'pkcs8',
        '-in',
        resolve(`receiver/tests/fixtures/keys/openssl-3.5-${bits}.pem`),
        '-passin',
        `file:${syntheticPassword}`,
        '-outform',
        'DER',
      ],
      { windowsHide: true },
    );
    expect(result.status).toBe(0);
    const privateDER = result.stdout;
    try {
      for (const text of [
        '',
        '  \r\n',
        'a'.repeat(26),
        'שלום العربية 🔑 e\u0301\u0000',
        'a'.repeat(65536),
      ]) {
        const output = await page.evaluate(
          async ({ pem, text }) => {
            const recipient = await window.zodiacTest.importPublicKey(pem);
            const output = await window.zodiacTest.encryptMessage(
              text,
              recipient,
            );
            return { raw: output.raw, fingerprint: output.fingerprint };
          },
          { pem, text },
        );
        expect(output.fingerprint).toBe(
          fixtures.fixtures.find(
            (f: { filename: string }) =>
              f.filename === `openssl-3.5-${bits}.pem`,
          ).fingerprint,
        );
        const decrypt = (raw: string) =>
          spawnSync(oracle, [], {
            input: JSON.stringify({
              Mode: 'decrypt',
              PrivateDER: privateDER.toString('base64'),
              Raw: raw,
            }),
            encoding: 'utf8',
            windowsHide: true,
          });
        const decrypted = decrypt(output.raw);
        expect(decrypted.status).toBe(0);
        expect(
          Buffer.from(JSON.parse(decrypted.stdout).result, 'base64'),
        ).toEqual(Buffer.from(text));
        if (text.length === 26)
          expect(output.raw).toHaveLength(bits === 3072 ? 584 : 755);
        for (const offset of [0, bits / 8, bits / 8 + 12, bits / 8 + 28]) {
          const bytes = Buffer.from(output.raw, 'base64url');
          if (offset >= bytes.length) continue;
          bytes[offset] = bytes[offset]! ^ 1;
          expect(decrypt(bytes.toString('base64url')).status).toBe(4);
        }
        for (const raw of [
          output.raw + '\n',
          output.raw + '=',
          output.raw + '+',
          'A',
          output.raw.slice(0, -2),
        ])
          expect(decrypt(raw).status).toBe(4);
      }
      const invalid = await page.evaluate(async (pem) => {
        const recipient = await window.zodiacTest.importPublicKey(pem);
        for (const text of ['\ud800', '\udc00', '🔑'.repeat(16385)]) {
          try {
            await window.zodiacTest.encryptMessage(text, recipient);
            return false;
          } catch {
            /* expected */
          }
        }
        return true;
      }, pem);
      expect(invalid).toBe(true);
      expect(remoteRequests).toEqual([]);
      expect(
        await page.evaluate(() => ({
          local: localStorage.length,
          session: sessionStorage.length,
          cookies: document.cookie,
          workers: typeof navigator.serviceWorker !== 'undefined',
        })),
      ).toMatchObject({ local: 0, session: 0, cookies: '' });
    } finally {
      privateDER.fill(0);
    }
  });
}
