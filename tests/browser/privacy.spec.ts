import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import type { ExportBundle } from '../../src/lib/export/layout';
import { openCustomKey } from './sender-controls';

async function exported(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return readFileSync((await (await pending).path())!);
}
async function storage(page: Page) {
  return page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    databases: await indexedDB.databases(),
    caches: await caches.keys(),
    workers: (await navigator.serviceWorker.getRegistrations()).length,
    cookie: document.cookie,
    history: history.state,
    styles: document.querySelectorAll('[style]').length,
  }));
}

test('all warm sender and recovery actions work with HTTP offline and leave no browser persistence or logged input', async ({
  page,
  context,
}, info) => {
  const initial: string[] = [],
    runtime: string[] = [],
    logs: string[] = [],
    errors: string[] = [];
  context.on('request', (r) => initial.push(r.url()));
  context.on('page', (p) => p.on('console', (m) => logs.push(m.text())));
  page.on('console', (m) => logs.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const recovery = await context.newPage();
  recovery.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByLabel('Message', { exact: true })).toBeEnabled();
  await recovery.goto('/restore/');
  await expect(
    recovery.getByRole('button', { name: 'Printed rows', exact: true }),
  ).toBeVisible();
  const titles = [await page.title(), await recovery.title()];
  for (const url of initial) {
    const parsed = new URL(url);
    expect(parsed.origin).toBe('http://127.0.0.1:4321');
    expect(parsed.search + parsed.hash).toBe('');
  }
  context.on('request', (r) => runtime.push(r.url()));
  await context.route(/^https?:/, (route) => route.abort());
  await context.setOffline(true);
  for (const p of [page, recovery]) {
    await p.evaluate(() => {
      (window as unknown as { violations: string[] }).violations = [];
      document.addEventListener('securitypolicyviolation', (e) =>
        (window as unknown as { violations: string[] }).violations.push(
          e.violatedDirective,
        ),
      );
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw Error('Synthetic clipboard denial');
          },
        },
      });
    });
  }
  const message =
    'SYNTHETIC-PRIVACY-MARKER Hebrew \u05e9\u05dc\u05d5\u05dd Arabic \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \ud83d\udd11\n' +
    'x'.repeat(700);
  await openCustomKey(page);
  const pem = readFileSync(
    'receiver/tests/fixtures/keys/openssl-3.5-4096-public.pem',
    'utf8',
  );
  await page.getByLabel('Choose public PEM file').setInputFiles({
    name: 'synthetic-public.pem',
    mimeType: 'text/plain',
    buffer: Buffer.from(pem),
  });
  await expect(page.locator('.recipient-summary')).toContainText('RSA-4096');
  await page.getByLabel('Message', { exact: true }).fill(message);
  await page
    .getByRole('button', { name: 'Encrypt message', exact: true })
    .click();
  const raw = await page.getByLabel('Raw ciphertext').inputValue();
  await page.getByRole('button', { name: 'Copy raw', exact: true }).click();
  await expect(page.getByLabel('Raw ciphertext')).toBeFocused();
  expect((await exported(page, 'Download ciphertext (.txt)')).toString()).toBe(
    raw,
  );
  const svg = await exported(page, 'Download full one-line SVG');
  expect([...svg.toString().matchAll(/<use /g)]).toHaveLength(raw.length);
  expect(svg.toString()).not.toContain(message);
  const png = await exported(page, 'Download complete artwork PNG');
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const data = JSON.parse(
    (await exported(page, 'Download metadata JSON')).toString(),
  ) as ExportBundle;
  await page.getByText('Archival pages and print', { exact: true }).click();
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page
    .getByRole('button', { name: 'Print / Save as PDF', exact: true })
    .click();
  expect(await page.locator('.print-page use').count()).toBe(raw.length);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('.zodiac-print-root')).toHaveCount(0);
  await recovery.getByLabel('Choose raw ciphertext .txt').setInputFiles({
    name: 'synthetic-raw.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(raw),
  });
  await recovery
    .getByRole('button', { name: 'Validate raw ciphertext', exact: true })
    .click();
  await expect(recovery.getByLabel('Recovered raw ciphertext')).toHaveValue(
    raw,
  );
  await recovery
    .getByRole('button', { name: 'Printed rows', exact: true })
    .click();
  await recovery
    .getByLabel('Printed whole-envelope SHA-256')
    .fill(data.context.envelopeSHA256);
  await recovery
    .getByLabel('Printed recipient fingerprint')
    .fill(data.context.recipientFingerprint);
  await recovery
    .getByLabel('Printed total raw characters')
    .fill(String(raw.length));
  for (const p of data.pages) {
    await recovery
      .getByLabel('Printed page number')
      .fill(String(p.pageIndex + 1));
    await recovery.getByLabel('Printed page check').fill(p.digest.slice(0, 12));
    await recovery
      .getByLabel('Printed rows: row number')
      .fill(
        p.rows
          .map((r) => `${r.rowIndex + 1} ${r.raw} ${r.checkCode}`)
          .join('\n'),
      );
    await recovery
      .getByRole('button', {
        name: 'Check rows / add complete page',
        exact: true,
      })
      .click();
  }
  await expect(recovery.getByLabel('Recovered raw ciphertext')).toHaveValue(
    raw,
  );
  await recovery
    .getByRole('button', { name: 'Copy recovered raw', exact: true })
    .click();
  expect(
    (
      await exported(recovery, 'Download recovered ciphertext (.txt)')
    ).toString(),
  ).toBe(raw);
  for (const [index, p] of [page, recovery].entries()) {
    expect(await p.title()).toBe(titles[index]);
    expect(new URL(p.url()).search + new URL(p.url()).hash).toBe('');
    expect(await storage(p)).toEqual({
      local: 0,
      session: 0,
      databases: [],
      caches: [],
      workers: 0,
      cookie: '',
      history: null,
      styles: 0,
    });
    expect(
      await p.evaluate(
        () => (window as unknown as { violations: string[] }).violations,
      ),
    ).toEqual([]);
  }
  expect(await context.cookies()).toEqual([]);
  expect(runtime).toEqual([]);
  expect(errors).toEqual([]);
  for (const secret of [message, raw, pem])
    expect(logs.join('\n')).not.toContain(secret);
  // Network-off operation plus real native CLI interop in workspace.spec proves
  // the browser flow; process source/vendor checks separately constrain the CLI.
  mkdirSync('artifacts/m4', { recursive: true });
  writeFileSync(
    `artifacts/m4/privacy-${info.project.name}.json`,
    JSON.stringify(
      {
        browser: context.browser()!.version(),
        initialStaticRequests: initial.length,
        runtimeRequests: runtime.length,
        storage: 'empty',
        logs: 'no synthetic inputs',
        allWarmActions: 'passed',
        network: 'HTTP blocked and context offline',
      },
      null,
      2,
    ) + '\n',
  );
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  await recovery
    .getByRole('button', { name: 'Clear recovery', exact: true })
    .click();
  await expect(recovery.getByLabel('Recovered raw ciphertext')).toHaveCount(0);
});

test('real navigation and persisted pageshow reset draft, custom recipient, result, recovery and print state', async ({
  page,
}, info) => {
  const persisted: boolean[] = [];
  await page.addInitScript(() =>
    window.addEventListener('pageshow', (event) =>
      console.debug(`Synthetic pageshow persisted=${event.persisted}`),
    ),
  );
  page.on('console', (m) => {
    if (m.text().startsWith('Synthetic pageshow'))
      persisted.push(m.text().endsWith('true'));
  });
  await page.goto('/');
  await openCustomKey(page);
  await page
    .getByLabel('Paste public PEM')
    .fill(
      readFileSync(
        'receiver/tests/fixtures/keys/openssl-3.5-4096-public.pem',
        'utf8',
      ),
    );
  await page
    .getByRole('button', { name: 'Use pasted public key', exact: true })
    .click();
  await page
    .getByLabel('Message', { exact: true })
    .fill('SYNTHETIC-HISTORY-DRAFT');
  await page.goto('/privacy/');
  await page.goBack();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  await expect(page.locator('.recipient-summary')).toContainText('RSA-3072');
  await page
    .getByLabel('Message', { exact: true })
    .fill('Synthetic navigation encrypted result');
  await page
    .getByRole('button', { name: 'Encrypt message', exact: true })
    .click();
  const raw = await page.getByLabel('Raw ciphertext').inputValue();
  await page.getByText('Archival pages and print', { exact: true }).click();
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page
    .getByRole('button', { name: 'Print / Save as PDF', exact: true })
    .click();
  await expect(page.locator('.zodiac-print-root')).toHaveCount(1);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await expect(page.locator('.zodiac-print-root')).toHaveCount(0);
  await expect(page.getByLabel('Raw ciphertext')).toHaveCount(0);
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  await page.goto('/restore/');
  await page.getByLabel('Paste raw ciphertext', { exact: true }).fill(raw);
  await page
    .getByRole('button', { name: 'Validate raw ciphertext', exact: true })
    .click();
  await expect(page.getByLabel('Recovered raw ciphertext')).toHaveValue(raw);
  await page.goto('/how-it-works/');
  await page.goBack();
  await expect(
    page.getByLabel('Paste raw ciphertext', { exact: true }),
  ).toHaveValue('');
  await expect(page.getByLabel('Recovered raw ciphertext')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByLabel('Paste raw ciphertext', { exact: true }),
  ).toHaveValue('');
  mkdirSync('artifacts/m4', { recursive: true });
  writeFileSync(
    `artifacts/m4/navigation-${info.project.name}.json`,
    JSON.stringify(
      {
        realNavigationPassed: true,
        observedPageShowPersisted: persisted,
        explicitPersistedEventPassed: true,
        claim:
          'Actual history/reload reset plus explicit cached-restore branch; no claim that automation forced real BFCache.',
      },
      null,
      2,
    ) + '\n',
  );
});
