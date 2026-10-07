import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assemblePages } from '../../src/lib/codecs/recovery';
import type { ExportBundle } from '../../src/lib/export/layout';

async function encrypt(page: Page, message: string) {
  await page.goto('/');
  await page.getByLabel('Message', { exact: true }).fill(message);
  await page.locator('.compare-confirmation input').check();
  await page
    .getByRole('button', { name: 'Encrypt message', exact: true })
    .click();
  await expect(page.getByLabel('Raw ciphertext')).toBeVisible();
  return page.getByLabel('Raw ciphertext').inputValue();
}
async function download(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const file = await pending;
  return {
    bytes: readFileSync((await file.path())!),
    filename: file.suggestedFilename(),
  };
}
function pngSize(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
test('full SVG, complete mixed PNG, selected archival exports and metadata recover exact raw under CSP', async ({
  page,
}, info) => {
  const plaintext = 'Synthetic export: שלום 🙂',
    errors: string[] = [],
    requests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const raw = await encrypt(page, plaintext);
  await page.route('**/*', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.evaluate(() => {
    (window as unknown as { failures: string[] }).failures = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { failures: string[] }).failures.push(
        e.violatedDirective,
      ),
    );
  });
  const strip = await download(page, 'Download full SVG');
  expect(strip.filename).toBe('ciphertext-strip.svg');
  expect(
    [...strip.bytes.toString().matchAll(/data-offset="\d+"/g)].length,
  ).toBe(raw.length);
  expect(strip.bytes.toString()).toContain('presentation&quot;:&quot;S64M1');
  expect(strip.bytes.toString()).not.toContain(plaintext);
  const compact = await download(page, 'Download complete artwork PNG'),
    size = pngSize(compact.bytes);
  expect(size.width).toBe(816);
  expect(size.height).toBeLessThanOrEqual(4096);
  mkdirSync('artifacts/exports', { recursive: true });
  writeFileSync(
    `artifacts/exports/complete-${info.project.name}.png`,
    compact.bytes,
  );
  const json = await download(page, 'Download metadata JSON'),
    data = JSON.parse(json.bytes.toString()) as ExportBundle & {
      context: ExportBundle['context'];
    };
  expect(data.raw).toBe(raw);
  const recovered = await assemblePages(
    data.context,
    data.pages.map((p) => ({ ...p, checkCode: p.digest.slice(0, 12) })),
  );
  expect(recovered.raw).toBe(raw);
  const key = spawnSync(
    resolve('.cache/toolchains/openssl35/x64/bin/openssl.exe'),
    [
      'pkcs8',
      '-in',
      resolve('receiver/tests/fixtures/keys/openssl-3.5-3072.pem'),
      '-passin',
      `file:${resolve('receiver/tests/fixtures/keys/synthetic-password.txt')}`,
      '-outform',
      'DER',
    ],
    { windowsHide: true },
  );
  expect(key.status).toBe(0);
  try {
    const result = spawnSync(resolve('artifacts/interop-oracle.exe'), [], {
      input: JSON.stringify({
        mode: 'decrypt',
        raw: recovered.raw,
        privateDER: key.stdout.toString('base64'),
      }),
      encoding: 'utf8',
      windowsHide: true,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(
      Buffer.from(JSON.parse(result.stdout).result, 'base64').toString(),
    ).toBe(plaintext);
  } finally {
    key.stdout.fill(0);
  }
  await expect(
    page.getByText('Archival pages and print', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('details').filter({ hasText: 'Archival pages and print' }),
  ).toHaveAttribute('open', '');
  await page.getByLabel('Archival page (').fill('2');
  const final = await download(page, 'Download archival page SVG');
  expect(final.filename).toBe('ciphertext-page-2-of-2.svg');
  expect(
    [...final.bytes.toString().matchAll(/data-offset="\d+"/g)].length,
  ).toBe(raw.length - 512);
  expect(final.bytes.toString()).toContain('S64M1');
  expect(final.bytes.toString()).toContain('Symbols');
  expect(final.bytes.toString()).toContain(
    `Recipient: ${data.context.recipientFingerprint.slice(0, 12)}${'*'.repeat(data.context.recipientFingerprint.length - 15)}${data.context.recipientFingerprint.slice(-3)}`,
  );
  expect(final.bytes.toString()).not.toContain('Zodiac Modern - page');
  expect(final.bytes.toString()).not.toContain('S64CHECK1 page check');
  expect(final.bytes.toString()).not.toContain('Recover using all raw rows');
  const pagePNG = await download(page, 'Download archival page PNG');
  expect(pngSize(pagePNG.bytes).width).toBe(816);
  writeFileSync(
    `artifacts/exports/page-final-${info.project.name}.png`,
    pagePNG.bytes,
  );
  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.locator('[style]').count()).toBe(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { failures: string[] }).failures,
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});

test('maximum output offers explicitly partial PNG pages and a complete bounded mixed-grid SVG', async ({
  page,
}) => {
  const raw = await encrypt(page, 'x'.repeat(65536));
  await expect(
    page.getByRole('button', {
      name: 'Download artwork page 1 of 172 PNG',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel('Archival page (').fill('172');
  const image = await download(page, 'Download artwork page 172 of 172 PNG');
  expect(pngSize(image.bytes).height).toBeLessThanOrEqual(4096);
  const svg = await download(page, 'Download full SVG');
  expect([...svg.bytes.toString().matchAll(/data-offset="\d+"/g)].length).toBe(
    raw.length,
  );
  expect(svg.bytes.toString()).toContain('presentation&quot;:&quot;S64M1');
  expect(svg.bytes.length).toBeLessThan(16 * 1024 * 1024);
  await page.getByLabel('Print scope').selectOption('selected');
  await expect(
    page.getByText('PARTIAL: print page 172 of 172', { exact: false }),
  ).toBeVisible();
});

test('native clipboard writes, Chromium image paste, exact text paste and denial fallback retain raw delivery', async ({
  page,
  context,
}, info) => {
  if (info.project.name === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const raw = await encrypt(page, 'Synthetic clipboard only');
  await page.evaluate(() => {
    const target = document.createElement('div');
    target.contentEditable = 'true';
    target.id = 'synthetic-paste';
    target.setAttribute('aria-label', 'Synthetic paste target');
    document.body.append(target);
    document.addEventListener('paste', (event) => {
      const png = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.type === 'image/png')
        ?.getAsFile();
      (
        window as unknown as { pasted: { type: string; size: number } | null }
      ).pasted = png ? { type: png.type, size: png.size } : null;
      (window as unknown as { pasteTypes: string[] }).pasteTypes = [
        ...(event.clipboardData?.types ?? []),
      ];
    });
  });
  const copy = page.getByRole('button', {
    name: 'Copy artwork image',
    exact: true,
  });
  expect(await copy.isEnabled()).toBe(true);
  await copy.click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Artwork image copied.' }),
  ).toBeVisible();
  await page.bringToFront();
  await page.locator('#synthetic-paste').scrollIntoViewIfNeeded();
  await page.locator('#synthetic-paste').focus();
  await page.keyboard.press('Control+v');
  if (info.project.name === 'chromium')
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { pasted: { type: string } }).pasted?.type,
        ),
      )
      .toBe('image/png');
  else {
    await page.waitForTimeout(200);
    info.annotations.push({
      type: 'firefox-paste-observation',
      description: JSON.stringify(
        await page.evaluate(() => ({
          types:
            (window as unknown as { pasteTypes: string[] }).pasteTypes ?? [],
          text: document.querySelector('#synthetic-paste')?.textContent,
        })),
      ),
    });
  }
  await page.getByRole('button', { name: 'Copy raw', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Raw ciphertext copied' }),
  ).toBeVisible();
  await page.locator('#synthetic-paste').fill('');
  await page.locator('#synthetic-paste').focus();
  await page.keyboard.press('Control+v');
  await expect(page.locator('#synthetic-paste')).toHaveText(raw);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        write: async () => {
          throw Error('synthetic denial');
        },
      },
    }),
  );
  await copy.click();
  await expect(
    page.getByAltText(
      'Locally generated ciphertext artwork for saving after clipboard denial',
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Raw ciphertext')).toHaveValue(raw);
  const fallback = await download(page, 'Download complete artwork PNG');
  expect(pngSize(fallback.bytes).width).toBe(816);
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  await expect(
    page.getByAltText(
      'Locally generated ciphertext artwork for saving after clipboard denial',
    ),
  ).toHaveCount(0);
  info.annotations.push({
    type: 'clipboard-paste',
    description:
      info.project.name === 'chromium'
        ? 'Real OS image/png and exact text paste in local synthetic target; external Gmail/Outlook drafts require separate client evidence.'
        : 'Real native clipboard write resolved. Windows headless Firefox native paste is observed separately; no email-client paste claim.',
  });
});

test('request-only print uses all immutable pages, A4/Letter fit, partial scope and cancel/retry cleanup', async ({
  page,
}, info) => {
  const message = 'Synthetic print recovery '.repeat(35),
    raw = await encrypt(page, message);
  const metadataFile = await download(page, 'Download metadata JSON');
  const recipientFingerprint = (
    JSON.parse(metadataFile.bytes.toString()) as ExportBundle
  ).context.recipientFingerprint;
  await expect(page.locator('.zodiac-print-root')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Last glyph page', exact: true })
    .click();
  await page.evaluate(() => {
    window.print = () => {};
  });
  const pageCount = Math.ceil(raw.length / 512);
  for (const format of ['A4', 'Letter'] as const) {
    await page
      .getByRole('button', { name: 'Print / Save as PDF', exact: true })
      .click();
    await expect(page.locator('.print-page')).toHaveCount(pageCount);
    expect(await page.locator('.print-page [data-offset]').count()).toBe(
      raw.length,
    );
    expect(await page.locator('.print-page [data-after-offset]').count()).toBe(
      Math.floor(raw.length / 8),
    );
    const xml = await page
      .locator('.print-page svg')
      .evaluateAll((nodes) => nodes.map((node) => node.outerHTML).join(''));
    expect(xml).not.toContain(message);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByLabel('Raw ciphertext')).toBeHidden();
    await expect(page.getByLabel('Message', { exact: true })).toHaveCount(0);
    if (info.project.name === 'chromium') {
      await page.pdf({
        path: `artifacts/exports/print-${format}.pdf`,
        format,
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
        printBackground: true,
      });
      writeFileSync(
        'artifacts/exports/print-expected.json',
        JSON.stringify({
          raw,
          pageCount,
          plaintext: message,
          recipientFingerprint,
        }),
      );
    } else
      await page
        .locator('.print-page')
        .first()
        .screenshot({ path: 'artifacts/exports/print-firefox-first.png' });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('.zodiac-print-root')).toHaveCount(0);
    await expect(page.getByLabel('Raw ciphertext')).toHaveValue(raw);
  }
  await page.getByLabel('Print scope').selectOption('selected');
  await page.getByLabel('Archival page (').fill('2');
  await page
    .getByRole('button', { name: 'Print / Save as PDF', exact: true })
    .click();
  await expect(page.locator('.print-page')).toHaveCount(1);
  await expect(page.locator('.print-page')).toContainText('PARTIAL');
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  await expect(page.locator('.zodiac-print-root')).toHaveCount(0);
});

test('PNG failure and clear during encoding release resources without stale downloads', async ({
  page,
}) => {
  const raw = await encrypt(page, 'Synthetic raster failure/cancellation');
  const downloads: string[] = [];
  page.on('download', (file) => downloads.push(file.suggestedFilename()));
  await page.evaluate(() => {
    const created = new Set<string>(),
      canvases: HTMLCanvasElement[] = [];
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      created.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      created.delete(url);
      revoke(url);
    };
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      canvases.push(this);
      callback(null);
    };
    (window as unknown as { qa: object }).qa = { created, canvases, original };
  });
  await page
    .getByRole('button', { name: 'Download complete artwork PNG', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Artwork action unavailable' }),
  ).toBeVisible();
  await expect(page.getByLabel('Raw ciphertext')).toHaveValue(raw);
  expect(
    await page.evaluate(() => {
      const qa = (
        window as unknown as {
          qa: { created: Set<string>; canvases: HTMLCanvasElement[] };
        }
      ).qa;
      return {
        urls: qa.created.size,
        sizes: qa.canvases.map((c) => [c.width, c.height]),
      };
    }),
  ).toEqual({ urls: 0, sizes: [[0, 0]] });
  await page.getByLabel('Archival page (').fill('1.5');
  await expect(
    page.getByRole('button', {
      name: 'Download archival page PNG',
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel('Archival page (').fill('1');
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      const qa = (
        window as unknown as {
          qa: { canvases: HTMLCanvasElement[]; finish: () => void };
        }
      ).qa;
      qa.canvases.push(this);
      qa.finish = () =>
        callback(new Blob(['synthetic encoding'], { type: 'image/png' }));
    };
  });
  await page
    .getByRole('button', { name: 'Download complete artwork PNG', exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof (window as unknown as { qa: { finish: unknown } }).qa.finish,
      ),
    )
    .toBe('function');
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  await page.evaluate(() =>
    (window as unknown as { qa: { finish: () => void } }).qa.finish(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { qa: { created: Set<string> } }).qa.created
            .size,
      ),
    )
    .toBe(0);
  expect(downloads).toEqual([]);
  await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
});
