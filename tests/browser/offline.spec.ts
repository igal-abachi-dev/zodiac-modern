import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { openCustomKey } from './sender-controls';
import type { ExportBundle } from '../../src/lib/export/layout';
test('file probe opens under default settings with no adjacent files or network', async ({
  page,
}, testInfo) => {
  testInfo.annotations.push({
    type: 'browser-version',
    description: page.context().browser()!.version(),
  });
  const html = readFileSync(
    resolve('artifacts/offline probe שלום/zodiac-synthetic-probe.html'),
    'utf8',
  );
  for (const tag of ['script', 'style']) {
    const body = html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))![1]!;
    expect(html).toContain(
      `'sha256-${createHash('sha256').update(body).digest('base64')}'`,
    );
  }
  expect(html.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(
    html.indexOf('<script>'),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
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
  let recoveryRaw = '';
  let recoveryData: ExportBundle | null = null;
  for (const bits of [3072, 4096]) {
    const pem = readFileSync(
      `receiver/tests/fixtures/keys/openssl-3.5-${bits}-public.pem`,
      'utf8',
    );
    const text = 'Synthetic exact UTF-8 שלום 🔑\r\n  ';
    // textarea normalizes CRLF by design; compare the actual original DOM string.
    await openCustomKey(page);
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
    await expect(page.locator('#result-display')).toBeVisible();
    const raw = await page.getByLabel('Raw ciphertext').inputValue();
    recoveryRaw = raw;
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
    for (const [name, extension] of [
      ['Download full one-line SVG', 'svg'],
      ['Download complete artwork PNG', 'png'],
      ['Download metadata JSON', 'json'],
    ]) {
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name, exact: true }).click();
      const exported = await pending;
      const bytes = readFileSync((await exported.path())!);
      expect(exported.suggestedFilename()).toMatch(
        new RegExp(`\\.${extension}$`),
      );
      if (extension === 'svg')
        expect([...bytes.toString().matchAll(/<use /g)].length).toBe(
          raw.length,
        );
      if (extension === 'json') {
        recoveryData = JSON.parse(bytes.toString()) as ExportBundle;
        expect(JSON.parse(bytes.toString()).raw).toBe(raw);
      }
      if (extension === 'png') {
        expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(bytes.readUInt32BE(20)).toBeLessThanOrEqual(4096);
      }
    }
    await page.getByText('Archival pages and print', { exact: true }).click();
    await page.evaluate(() => {
      window.print = () => {};
    });
    await page
      .getByRole('button', { name: 'Print / Save as PDF', exact: true })
      .click();
    await expect(page.locator('.print-page')).toHaveCount(
      Math.ceil(raw.length / 512),
    );
    expect(await page.locator('.print-page use').count()).toBe(raw.length);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('.zodiac-print-root')).toHaveCount(0);
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
    await expect(
      page.getByLabel('Raw ciphertext', { exact: false }),
    ).toBeVisible();
    await expect(page.locator('#result-display')).toBeVisible();
    const rawBounds = await page.locator('#result-raw').boundingBox();
    const displayBounds = await page.locator('#result-display').boundingBox();
    expect(rawBounds!.y + rawBounds!.height).toBeLessThanOrEqual(
      displayBounds!.y,
    );
    await expect(
      page.locator('.glyph-plate .glyph-cell[data-character]'),
    ).toHaveCount(512);
    await expect(page.locator('.glyph-plate .glyph-cell')).toHaveCount(576);
    expect(
      await page
        .locator('.glyph-plate .glyph-cell[data-character]')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-character')).join(''),
        ),
    ).toBe(raw.slice(0, 512));
    expect(
      await page
        .locator('.glyph-plate [data-kind="null"]')
        .first()
        .getAttribute('data-glyph'),
    ).toBe('CircleOff');
    expect(
      await page.locator('.glyph-plate .payload-character.mirrored').count(),
    ).toBe(9);
    expect(
      await page.locator('.glyph-plate .payload-character.rotated').count(),
    ).toBe(9);
    await page.getByRole('button', { name: 'Copy raw', exact: true }).click();
    await expect(page.getByLabel('Raw ciphertext')).toBeFocused();
    await expect(page.locator('#result-display')).toBeVisible();
    await page
      .getByRole('button', { name: 'Encrypt another message', exact: true })
      .click();
    await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  }
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  expect(await page.getByLabel('Raw ciphertext').count()).toBe(0);
  await page
    .getByText('Recover raw ciphertext locally', { exact: true })
    .click();
  await page
    .getByLabel('Paste raw ciphertext', { exact: true })
    .fill(recoveryRaw);
  await page
    .getByRole('button', { name: 'Validate raw ciphertext', exact: true })
    .click();
  await expect(
    page.getByLabel('Recovered raw ciphertext', { exact: true }),
  ).toHaveValue(recoveryRaw);
  await page
    .getByRole('button', { name: 'Copy recovered raw', exact: true })
    .click();
  await expect(
    page.getByLabel('Recovered raw ciphertext', { exact: true }),
  ).toBeFocused();
  await page
    .getByRole('button', { name: 'Clear recovery', exact: true })
    .click();
  expect(recoveryData).not.toBeNull();
  await page.getByRole('button', { name: 'Printed rows', exact: true }).click();
  await page
    .getByLabel('Printed whole-envelope SHA-256')
    .fill(recoveryData!.context.envelopeSHA256);
  await page
    .getByLabel('Printed recipient fingerprint')
    .fill(recoveryData!.context.recipientFingerprint);
  await page
    .getByLabel('Printed total raw characters')
    .fill(String(recoveryRaw.length));
  for (const p of recoveryData!.pages) {
    await page.getByLabel('Printed page number').fill(String(p.pageIndex + 1));
    await page.getByLabel('Printed page check').fill(p.digest.slice(0, 12));
    await page
      .getByLabel('Printed rows: row number')
      .fill(
        p.rows
          .map((r) => `${r.rowIndex + 1} ${r.raw} ${r.checkCode}`)
          .join('\n'),
      );
    await page
      .getByRole('button', {
        name: 'Check rows / add complete page',
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByLabel('Recovered raw ciphertext', { exact: true }),
  ).toHaveValue(recoveryRaw);
  await page
    .getByRole('button', { name: 'Clear recovery', exact: true })
    .click();
  expect(network).toEqual([]);
  expect(csp).toEqual([]);
  expect(await page.locator('[style]').count()).toBe(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});
