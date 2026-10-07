import { expect, test } from '@playwright/test';
import { openCustomKey } from './sender-controls';
import { createHash, createPublicKey } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('guide-created encrypted keys import and recover exact nonsecret text after backup restore', async ({
  page,
}) => {
  const root = mkdtempSync(resolve('.cache/key-guide-browser-'));
  const exe =
    process.env.ZODIAC_OPENSSL35 ??
    resolve('.cache/toolchains/openssl35/x64/bin/openssl.exe');
  const password = `file:${resolve('receiver/tests/fixtures/keys/synthetic-password.txt')}`;
  // This password source is test-fixture tooling only. The published setup uses
  // hidden interactive prompts, demonstrated separately in native trials.
  const run = (args: string[]) => {
    const result = spawnSync(exe, args, {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    expect(result.status, 'OpenSSL fixture generation failed').toBe(0);
    return result.stdout;
  };
  try {
    await page.goto('/keys/');
    await expect(
      page.getByRole('heading', {
        name: 'Create and keep recipient keys offline',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'direct vendor x64 installer' }),
    ).toHaveAttribute(
      'href',
      'https://www.firedaemon.com/download-firedaemon-openssl-3-5-x64',
    );
    await page.goto('/');
    for (const bits of [3072, 4096]) {
      const initial = join(root, `${bits}-initial.pem`),
        final = join(root, `${bits}-final.pem`),
        publicPath = join(root, `${bits}-public.pem`),
        backup = join(root, `${bits}-restored.pem`);
      run([
        'genpkey',
        '-algorithm',
        'RSA',
        '-aes-256-cbc',
        '-pkeyopt',
        `rsa_keygen_bits:${bits}`,
        '-pkeyopt',
        'rsa_keygen_pubexp:65537',
        '-pass',
        password,
        '-out',
        initial,
      ]);
      run([
        'pkcs8',
        '-topk8',
        '-in',
        initial,
        '-out',
        final,
        '-v2',
        'aes-256-cbc',
        '-v2prf',
        'hmacWithSHA256',
        '-iter',
        '600000',
        '-saltlen',
        '16',
        '-passin',
        password,
        '-passout',
        password,
      ]);
      run([
        'pkey',
        '-in',
        final,
        '-pubout',
        '-out',
        publicPath,
        '-passin',
        password,
      ]);
      run(['pkey', '-in', final, '-check', '-noout', '-passin', password]);
      expect(readFileSync(initial, 'utf8')).toContain(
        'BEGIN ENCRYPTED PRIVATE KEY',
      );
      expect(readFileSync(final, 'utf8')).toContain(
        'BEGIN ENCRYPTED PRIVATE KEY',
      );
      const pem = readFileSync(publicPath, 'utf8');
      const fingerprint = createHash('sha256')
        .update(createPublicKey(pem).export({ format: 'der', type: 'spki' }))
        .digest('hex');
      await openCustomKey(page);
      await page.getByLabel('Choose public PEM file').setInputFiles(publicPath);
      await expect(
        page.locator('.recipient-summary .fingerprint:not(.full-fingerprint)'),
      ).toContainText(fingerprint.slice(0, 12));
      const details = page.getByRole('button', {
        name: 'Recipient details',
        exact: true,
      });
      if ((await details.getAttribute('aria-expanded')) === 'false')
        await details.click();
      await expect(page.locator('.full-fingerprint')).toContainText(
        fingerprint,
      );
      await page
        .getByLabel('Message', { exact: true })
        .fill(`Nonsecret readiness ${bits}: שלום 🔑  `);
      const exact = await page
        .getByLabel('Message', { exact: true })
        .inputValue();
      await page.locator('.compare-confirmation input').check();
      await page
        .getByRole('button', { name: 'Encrypt message', exact: true })
        .click();
      const raw = page.getByLabel('Raw ciphertext');
      await expect(page.locator('#result-display')).toBeVisible();
      await expect(raw).toBeVisible();
      copyFileSync(final, backup);
      const privateDER = run([
        'pkcs8',
        '-in',
        backup,
        '-outform',
        'DER',
        '-passin',
        password,
      ]);
      try {
        const oracle = spawnSync(resolve('artifacts/interop-oracle.exe'), [], {
          input: JSON.stringify({
            Mode: 'decrypt',
            PrivateDER: privateDER.toString('base64'),
            Raw: await raw.inputValue(),
          }),
          encoding: 'utf8',
          windowsHide: true,
        });
        expect(oracle.status).toBe(0);
        expect(
          Buffer.from(JSON.parse(oracle.stdout).result, 'base64').toString(
            'utf8',
          ),
        ).toBe(exact);
      } finally {
        privateDER.fill(0);
      }
      await page
        .getByRole('button', { name: 'Encrypt another message', exact: true })
        .click();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
