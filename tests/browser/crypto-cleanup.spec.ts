import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('native WebCrypto fresh values, nonextractable AES and owned-buffer cleanup on success and failure', async ({
  page,
}) => {
  await page.goto('/');
  await page.addScriptTag({ url: '/_test/crypto.js' });
  const pem = readFileSync(
    'receiver/tests/fixtures/keys/openssl-3.5-3072-public.pem',
    'utf8',
  );
  const evidence = await page.evaluate(async (pem) => {
    const recipient = await window.zodiacTest.importPublicKey(pem);
    const realImport = crypto.subtle.importKey.bind(crypto.subtle),
      realEncrypt = crypto.subtle.encrypt.bind(crypto.subtle);
    const owned: Uint8Array[] = [],
      extractable: boolean[] = [],
      nonces: string[] = [],
      wraps: string[] = [];
    let fail = false;
    Object.defineProperty(crypto.subtle, 'importKey', {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto['importKey']>) => {
        if (args[0] === 'raw') owned.push(args[1] as Uint8Array);
        const key = await realImport(...args);
        if (key.algorithm.name === 'AES-GCM') extractable.push(key.extractable);
        return key;
      },
    });
    Object.defineProperty(crypto.subtle, 'encrypt', {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto['encrypt']>) => {
        if ((args[0] as Algorithm).name === 'AES-GCM') {
          owned.push(args[2] as Uint8Array);
          const p = args[0] as AesGcmParams;
          nonces.push(Array.from(p.iv as Uint8Array).join(','));
          if (fail) throw Error('synthetic failure');
        }
        const result = await realEncrypt(...args);
        if ((args[0] as Algorithm).name === 'RSA-OAEP')
          wraps.push(Array.from(new Uint8Array(result)).join(','));
        return result;
      },
    });
    for (let i = 0; i < 2; i++)
      await window.zodiacTest.encryptMessage('synthetic cleanup', recipient);
    fail = true;
    let failed = false;
    try {
      await window.zodiacTest.encryptMessage(
        'synthetic failure cleanup',
        recipient,
      );
    } catch {
      failed = true;
    }
    const cleared = owned.every((b) => b.every((v) => v === 0));
    return {
      failed,
      cleared,
      owned: owned.length,
      extractable,
      freshNonces: new Set(nonces).size,
      freshWraps: new Set(wraps).size,
    };
  }, pem);
  expect(evidence).toEqual({
    failed: true,
    cleared: true,
    owned: 6,
    extractable: [false, false, false],
    freshNonces: 3,
    freshWraps: 3,
  });
});
