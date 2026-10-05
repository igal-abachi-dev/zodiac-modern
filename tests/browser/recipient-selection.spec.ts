import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { validatePublicPEM } from '../../scripts/public-recipient.mjs';
import { openCustomKey } from './sender-controls';

const publicPEM = (bits: number) =>
  readFileSync(
    `receiver/tests/fixtures/keys/openssl-3.5-${bits}-public.pem`,
    'utf8',
  );
const fingerprint = (bits: number) =>
  validatePublicPEM(publicPEM(bits)).fingerprint;
async function details(page: Page) {
  const button = page.getByRole('button', {
    name: 'Recipient details',
    exact: true,
  });
  await expect(button).toBeVisible();
  if ((await button.getAttribute('aria-expanded')) === 'false')
    await button.click();
  return page.locator('.full-fingerprint');
}
async function importPaste(page: Page, pem: string) {
  await openCustomKey(page);
  await page.getByLabel('Paste public PEM').fill(pem);
  await page
    .getByRole('button', { name: 'Use pasted public key', exact: true })
    .click();
  await expect(page.getByLabel('Paste public PEM')).toHaveValue('');
  await expect(page.getByLabel('Paste public PEM')).toBeFocused();
}

test('local recipient file/paste selection preserves a rejected replacement, clears inputs, restores default and exports public PEM', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      (window as unknown as { violations: string[] }).violations.push(
        event.violatedDirective,
      ),
    );
  });
  await page.goto('/');
  await expect(await details(page)).toContainText(fingerprint(3072));
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  const input = page.getByLabel('Choose public PEM file');
  await openCustomKey(page);
  const maliciousName = '<img src=x onerror=alert(1)>.pem';
  await input.setInputFiles({
    name: maliciousName,
    mimeType: 'application/x-pem-file',
    buffer: Buffer.from(publicPEM(4096)),
  });
  await expect(page.locator('.full-fingerprint')).toContainText(
    fingerprint(4096),
  );
  await expect(page.locator('.filename')).toHaveText(
    `Local filename (unverified label): ${maliciousName}`,
  );
  expect(await page.locator('.filename img').count()).toBe(0);
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  const encrypted = readFileSync(
    'receiver/tests/fixtures/keys/openssl-3.5-3072.pem',
    'utf8',
  );
  await importPaste(page, encrypted);
  await expect(page.getByRole('alert')).toContainText(
    'previously selected recipient remains selected',
  );
  await expect(page.getByRole('alert')).not.toContainText('-----BEGIN');
  await expect(page.locator('.full-fingerprint')).toContainText(
    fingerprint(4096),
  );
  // Oversized files must be rejected before invoking their read method.
  await page.evaluate(() => {
    File.prototype.text = async () => {
      throw new Error('File.text must not be called for an oversized file');
    };
  });
  await input.setInputFiles({
    name: 'oversized.pem',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(16385, 32),
  });
  await expect(page.getByRole('alert')).toContainText('no larger than 16 KiB');
  await expect(page.locator('.full-fingerprint')).toContainText(
    fingerprint(4096),
  );
  await expect(input).toHaveValue('');
  await page
    .getByRole('button', { name: 'Use default recipient', exact: true })
    .click();
  await expect(page.locator('.full-fingerprint')).toContainText(
    fingerprint(3072),
  );
  await importPaste(page, publicPEM(4096).replaceAll('\n', '\r\n'));
  await expect(page.locator('.full-fingerprint')).toContainText(
    fingerprint(4096),
  );
  await expect(page.getByRole('alert')).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download public PEM', exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('recipient-public.pem');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  // Native textarea values normalize pasted CRLF to LF. Export preserves the
  // selected value; the separately tested DER fingerprint remains identical.
  expect(Buffer.concat(chunks).toString('utf8')).toBe(publicPEM(4096));
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.locator('[style]').count()).toBe(0);
  expect(
    await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      databases: (await indexedDB.databases()).length,
      caches: (await caches.keys()).length,
      workers: (await navigator.serviceWorker.getRegistrations()).length,
      violations: (window as unknown as { violations: string[] }).violations,
    })),
  ).toEqual({
    local: 0,
    session: 0,
    databases: 0,
    caches: 0,
    workers: 0,
    violations: [],
  });
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await page.reload();
  await expect(await details(page)).toContainText(fingerprint(3072));
  await expect(page.locator('.filename')).toHaveCount(0);
  await expect(page.getByLabel('Paste public PEM')).toHaveValue('');
  await openCustomKey(page);
  await page
    .getByRole('button', { name: 'Clear recipient', exact: true })
    .click();
  await expect(
    page.getByText('No recipient selected.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Use default recipient', exact: true })
    .click();
  await expect(await details(page)).toContainText(fingerprint(3072));
});

test('custom-only build has no fallback recipient and supports keyboard paste import without remembered selection', async ({
  page,
}) => {
  const response = await page.goto('http://127.0.0.1:4322/');
  expect(response?.headers()['content-security-policy']).toContain(
    "connect-src 'none'",
  );
  await expect(
    page.getByText(
      'No default recipient configured. Choose a custom public key.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Use default recipient', exact: true }),
  ).toHaveCount(0);
  const textarea = page.getByLabel('Paste public PEM');
  await openCustomKey(page);
  await textarea.fill('synthetic-invalid-marker');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Use pasted public key', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText(
    'No recipient is selected',
  );
  await expect(page.getByRole('alert')).not.toContainText(
    'synthetic-invalid-marker',
  );
  await expect(textarea).toHaveValue('');
  await expect(textarea).toBeFocused();
  await importPaste(page, publicPEM(3072));
  await expect(await details(page)).toContainText(fingerprint(3072));
  await page.reload();
  await expect(
    page.getByText('No recipient selected.', { exact: true }),
  ).toBeVisible();
  await expect(textarea).toHaveValue('');
});
