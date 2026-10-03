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
  await expect(page.getByRole('status')).toContainText(
    'Native WebCrypto is available',
  );
  for (const bits of [3072, 4096]) {
    const pem = readFileSync(
      `receiver/tests/fixtures/keys/openssl-3.5-${bits}-public.pem`,
      'utf8',
    );
    const text = 'Synthetic exact UTF-8 שלום 🔑\r\n  ';
    // textarea normalizes CRLF by design; compare the actual original DOM string.
    await page.getByLabel('Synthetic public SPKI PEM').fill(pem);
    await page.getByLabel('Synthetic message', { exact: true }).fill(text);
    const original = await page
      .getByLabel('Synthetic message', { exact: true })
      .inputValue();
    await page
      .getByRole('button', { name: 'Encrypt synthetic message' })
      .click();
    await expect(page.getByRole('status')).toContainText(`RSA-${bits}`);
    const raw = await page.getByLabel('Canonical raw ciphertext').inputValue();
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
    await expect(
      page.getByLabel('Synthetic message', { exact: true }),
    ).toHaveValue('');
  }
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByLabel('Canonical raw ciphertext')).toHaveValue('');
  expect(network).toEqual([]);
  expect(csp).toEqual([]);
  expect(await page.locator('[style]').count()).toBe(0);
});
