import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
test('file probe opens under default settings with no adjacent files or network', async ({
  page,
}) => {
  const csp: string[] = [];
  const network: string[] = [];
  await page.route(/^https?:/, async (route) => {
    network.push(route.request().url());
    await route.abort();
  });
  await page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', (event) =>
      console.error(`CSP:${event.violatedDirective}`),
    ),
  );
  page.on('console', (message) => {
    if (message.text().startsWith('CSP:')) csp.push(message.text());
  });
  await page.goto(
    pathToFileURL(
      resolve('artifacts/offline probe שלום/zodiac-synthetic-probe.html'),
    ).href,
  );
  await expect(page.locator('.recipient-summary strong')).toBeVisible();
  for (const bits of [3072, 4096]) {
    const pem = readFileSync(
      `receiver/tests/fixtures/keys/openssl-3.5-${bits}-public.pem`,
      'utf8',
    );
    const text = 'Synthetic exact UTF-8 שלום 🔑\r\n  ';
    // textarea normalizes CRLF by design; compare the actual original DOM string.
    if (bits === 3072) {
      await page.getByLabel('Choose public PEM file').setInputFiles({
        name: 'synthetic-public.pem',
        mimeType: 'text/plain',
        buffer: Buffer.from(pem),
      });
    } else {
      await page.getByLabel('Paste public PEM').fill(pem);
      await page
        .getByRole('button', { name: 'Use pasted public key', exact: true })
        .click();
    }
    await page.getByLabel('Message', { exact: true }).fill(text);
    const original = await page
      .getByLabel('Message', { exact: true })
      .inputValue();
    await page
      .getByRole('button', { name: 'Encrypt message', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Encrypted message', exact: true }),
    ).toBeFocused();
    const raw = await page.getByLabel('Raw ciphertext').inputValue();
    const openssl =
      process.env.ZODIAC_OPENSSL35 ??
      resolve('.cache/toolchains/openssl35/x64/bin/openssl.exe');
    const key = spawnSync(
      openssl,
      [
        'pkcs8',
        '-in',
        resolve(`receiver/tests/fixtures/keys/openssl-3.5-${bits}.pem`),
        '-passin',
        `file:${resolve('receiver/tests/fixtures/keys/synthetic-password.txt')}`,
        '-outform',
        'DER',
      ],
      { windowsHide: true },
    ).stdout;
    try {
      const result = spawnSync(resolve('artifacts/interop-oracle.exe'), [], {
        input: JSON.stringify({
          Mode: 'decrypt',
          PrivateDER: key.toString('base64'),
          Raw: raw,
        }),
        encoding: 'utf8',
        windowsHide: true,
      });
      expect(result.status).toBe(0);
      expect(
        Buffer.from(JSON.parse(result.stdout).result, 'base64').toString(),
      ).toBe(original);
    } finally {
      key.fill(0);
    }
    expect(await page.getByLabel('Message', { exact: true }).count()).toBe(0);
    const pendingDownload = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Download ciphertext (.txt)', exact: true })
      .click();
    const download = await pendingDownload;
    expect(readFileSync((await download.path())!, 'utf8')).toBe(raw);
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw Error('synthetic denial');
          },
        },
      }),
    );
    await page
      .getByRole('button', { name: 'Display view', exact: true })
      .click();
    await expect(
      page.getByLabel('Raw ciphertext', { exact: false }),
    ).toBeHidden();
    await page.getByRole('button', { name: 'Copy raw', exact: true }).click();
    await expect(page.getByLabel('Raw ciphertext')).toBeFocused();
    await page
      .getByRole('button', { name: 'Encrypt another message', exact: true })
      .click();
    await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  }
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  expect(await page.getByLabel('Raw ciphertext').count()).toBe(0);
  expect(network).toEqual([]);
  expect(csp).toEqual([]);
  expect(await page.locator('[style]').count()).toBe(0);
});
