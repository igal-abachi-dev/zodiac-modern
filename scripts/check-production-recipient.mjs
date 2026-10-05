// Public-only development acceptance. Never reads private keys or passphrases.
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { validatePublicPEM } from './public-recipient.mjs';
const config = JSON.parse(await readFile('config/recipient.json', 'utf8'));
const pem = await readFile(config.publicKey, 'utf8');
const recipient = validatePublicPEM(pem);
if (recipient.fingerprint !== config.fingerprint)
  throw Error('Expected public fingerprint mismatch.');
const servedPEM = await readFile(
  resolve('dist', config.publicKey.replace(/^public\//, '')),
  'utf8',
);
if (validatePublicPEM(servedPEM).fingerprint !== config.fingerprint)
  throw Error('Static public PEM mismatch.');
const server = spawn(process.execPath, ['scripts/serve-local.mjs'], {
  env: { ...process.env, ZODIAC_PORT: '4323' },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  await new Promise((accept, reject) => {
    const timeout = setTimeout(
      () => reject(Error('Production test server startup timed out.')),
      15000,
    );
    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.on('exit', (code) => {
      clearTimeout(timeout);
      reject(Error(`Production server exited ${code}.`));
    });
    server.stdout.on('data', () => {
      clearTimeout(timeout);
      accept();
    });
  });
  browser = await chromium.launch({ chromiumSandbox: true });
  const page = await browser.newPage();
  const errors = [],
    violations = [],
    requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__productionViolations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__productionViolations.push(e.violatedDirective),
    );
  });
  await page.goto('http://127.0.0.1:4323/');
  await expect(page.locator('.recipient-summary strong')).toHaveText(
    config.name,
  );
  page.on('request', (request) => requests.push(request.url()));
  await page
    .getByRole('button', { name: 'Recipient details', exact: true })
    .click();
  await expect(page.locator('.full-fingerprint')).toContainText(
    config.fingerprint,
  );
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download public PEM', exact: true })
    .click();
  const download = await pending;
  const exported = await readFile(await download.path(), 'utf8');
  if (
    validatePublicPEM(exported).fingerprint !== config.fingerprint ||
    exported !== recipient.pem
  )
    throw Error('Public PEM export mismatch.');
  await page
    .getByLabel('Message', { exact: true })
    .fill('01234567890123456789012345');
  await page
    .getByRole('button', { name: 'Encrypt message', exact: true })
    .click();
  await expect(page.locator('#result-display')).toBeVisible();
  await expect(page.getByLabel('Raw ciphertext')).toBeVisible();
  const raw = await page.getByLabel('Raw ciphertext').inputValue();
  if (raw.length !== (recipient.bits === 4096 ? 755 : 584))
    throw Error('Production envelope length mismatch.');
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      styles: document.querySelectorAll('[style]').length,
      violations: window.__productionViolations,
    })),
  ).toEqual({ local: 0, session: 0, styles: 0, violations });
  const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
  await mkdir('artifacts/production-public-check', { recursive: true });
  await writeFile('artifacts/production-public-check/ciphertext.txt', raw);
  await writeFile(
    'docs/reviews/production-recipient-evidence.json',
    JSON.stringify(
      {
        recorded: new Date().toISOString(),
        scope:
          'Author-run public configuration/browser check, synthetic 26-byte message only. No private-key access; not audit or release verification.',
        fingerprint: config.fingerprint,
        recipientName: config.name,
        rsaBits: recipient.bits,
        browser: browser.version(),
        chromiumSandbox: true,
        rawCharacters: raw.length,
        hashes: {
          [config.publicKey]: hash(await readFile(config.publicKey)),
          'config/recipient.json': hash(
            await readFile('config/recipient.json'),
          ),
          'dist/index.html': hash(await readFile('dist/index.html')),
          'dist/.security-headers.json': hash(
            await readFile('dist/.security-headers.json'),
          ),
        },
        publicPEMExportCanonicalExact: true,
        runtimeRequests: requests,
        violations,
        errors,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Production public recipient browser acceptance passed: RSA-${recipient.bits}, SHA-256 ${config.fingerprint}.`,
  );
} finally {
  if (browser) await browser.close();
  server.kill();
}
