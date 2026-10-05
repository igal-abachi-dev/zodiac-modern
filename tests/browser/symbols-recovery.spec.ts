import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createCheckPages } from '../../src/lib/codecs/recovery';
import { openCustomKey } from './sender-controls';
async function expectGridStart(page: Page) {
  await expect
    .poll(() =>
      page.locator('.glyph-plate').evaluate((grid) => {
        const target = Math.max(
          0,
          Math.min(
            scrollY + grid.getBoundingClientRect().top,
            document.documentElement.scrollHeight - innerHeight,
          ),
        );
        return Math.abs(scrollY - target);
      }),
    )
    .toBeLessThan(2);
}
const fingerprint = 'ab'.repeat(32);
async function bundle(raw: string) {
  return createCheckPages(raw, fingerprint);
}
const rows = (page: Awaited<ReturnType<typeof bundle>>['pages'][number]) =>
  page.rows.map((r) => `${r.rowIndex + 1} ${r.raw} ${r.checkCode}`).join('\n');

test('glyph preview is ordered, bounded, responsive and keeps full raw accessible', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page
    .getByLabel('Message', { exact: true })
    .fill('Synthetic glyph preview: שלום 🔑');
  await page
    .getByRole('button', { name: 'Encrypt message', exact: true })
    .click();
  const raw = await page.getByLabel('Raw ciphertext').inputValue();
  await expect(page.locator('#result-display')).toBeVisible();
  const cells = page.locator('.glyph-plate .glyph-cell[data-character]');
  await expect(cells).toHaveCount(512);
  await expect(page.locator('.glyph-plate .glyph-cell')).toHaveCount(576);
  const presentation = await page
    .locator('.glyph-plate .glyph-cell')
    .evaluateAll((items) =>
      items.map((item) => ({
        kind: item.getAttribute('data-kind'),
        character: item.getAttribute('data-character'),
        offset: item.getAttribute('data-offset'),
        after: item.getAttribute('data-after-offset'),
        glyph: item.getAttribute('data-glyph'),
        text: item.textContent,
      })),
    );
  let payloadOffset = 0,
    nullIndex = 0;
  for (const token of presentation) {
    if (token.kind === 'null') {
      expect(payloadOffset % 8).toBe(0);
      expect(token.after).toBe(String(payloadOffset - 1));
      expect(token.character).toBeNull();
      expect(token.offset).toBeNull();
      expect(token.glyph).toBe(
        ['CircleOff', 'Crosshair', 'Skull'][nullIndex++ % 3],
      );
    } else {
      expect(token.offset).toBe(String(payloadOffset));
      expect(token.character).toBe(raw[payloadOffset]);
      expect(token.kind).toBe(payloadOffset % 4 === 0 ? 'literal' : 'glyph');
      if (token.kind === 'literal') expect(token.text).toBe(raw[payloadOffset]);
      else
        expect(['CircleOff', 'Crosshair', 'Skull']).not.toContain(token.glyph);
      payloadOffset++;
    }
  }
  expect(payloadOffset).toBe(512);
  expect(nullIndex).toBe(64);
  expect(
    await page.locator('.glyph-plate .payload-character.mirrored').count(),
  ).toBe(9);
  expect(
    await page.locator('.glyph-plate .payload-character.rotated').count(),
  ).toBe(9);
  for (const [className, d] of [
    ['mirrored', 1],
    ['rotated', -1],
  ] as const) {
    expect(
      await page
        .locator(`.glyph-plate .payload-character.${className}`)
        .first()
        .evaluate((node) => {
          const matrix = new DOMMatrixReadOnly(
            getComputedStyle(node).transform,
          );
          return [Math.round(matrix.a), Math.round(matrix.d)];
        }),
    ).toEqual([-1, d]);
  }
  expect(
    await page
      .locator('.glyph-plate [tabindex], .glyph-plate button, .glyph-plate a')
      .count(),
  ).toBe(0);
  expect(await page.locator('[style]').count()).toBe(0);
  expect(
    await cells.evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-character')).join(''),
    ),
  ).toBe(raw.slice(0, 512));
  expect(await cells.first().getAttribute('data-offset')).toBe('0');
  await page
    .getByRole('button', { name: 'Next glyph page', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expectGridStart(page);
  await expect(cells).toHaveCount(raw.length - 512);
  await page
    .getByRole('button', { name: 'Previous glyph page', exact: true })
    .click();
  await expectGridStart(page);
  await expect(cells).toHaveCount(512);
  await page
    .getByRole('button', { name: 'Next glyph page', exact: true })
    .click();
  await expectGridStart(page);
  expect(
    await page
      .locator('.glyph-plate [data-kind="null"]')
      .first()
      .getAttribute('data-glyph'),
  ).toBe('Crosshair');
  expect(
    await cells.evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-character')).join(''),
    ),
  ).toBe(raw.slice(512));
  await expect(
    page.getByRole('button', { name: 'Next glyph page', exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page
      .locator('.glyph-plate')
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length,
      ),
  ).toBe(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByText('Glyph legend: all 64 characters', { exact: true })
    .click();
  await expect(page.locator('.glyph-legend li')).toHaveCount(64);
  await expect(page.locator('.null-legend li')).toHaveCount(3);
  await expect(page.locator('.glyph-legend')).toContainText('CircleDashed');
  expect(await page.locator('.glyph-legend').textContent()).not.toContain(
    'Crosshair',
  );
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.getByRole('button', { name: 'Raw view', exact: true }).click();
  await expect(page.getByLabel('Raw ciphertext')).toHaveValue(raw);
  expect(await page.locator('[style]').count()).toBe(0);
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Display view', exact: true }).click();
  // Only synthetic ciphertext/artwork; no plaintext composer or private input.
  // Playwright screenshots temporarily alter DOM styles. Product DOM assertions
  // above precede that test-tool intervention; screenshots are visual evidence.
  await page
    .getByRole('button', { name: 'First glyph page', exact: true })
    .click();
  await expectGridStart(page);
  await page
    .locator('.glyph-plate')
    .screenshot({ path: `artifacts/mixed-grid-${info.project.name}.png` });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('.glyph-plate').screenshot({
    path: `artifacts/mixed-grid-mobile-${info.project.name}.png`,
  });
  await page.setViewportSize({ width: 1100, height: 900 });
  await page
    .locator('.glyph-legend')
    .screenshot({ path: `artifacts/glyph-legend-${info.project.name}.png` });
  await page
    .getByRole('button', { name: 'Small legend glyphs (16 px)', exact: true })
    .click();
  await page.locator('.glyph-legend').screenshot({
    path: `artifacts/glyph-legend-small-${info.project.name}.png`,
  });
  await page
    .getByRole('button', { name: 'Small legend glyphs (16 px)', exact: true })
    .click();
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });
  await page.locator('.glyph-plate').screenshot({
    path: `artifacts/mixed-grid-print-${info.project.name}.png`,
  });
  await page.locator('.glyph-legend').screenshot({
    path: `artifacts/glyph-legend-print-${info.project.name}.png`,
  });
});

test('maximum message preview reaches its last slice while exports retain the entire RSA-4096 envelope', async ({
  page,
}) => {
  await page.goto('/');
  await openCustomKey(page);
  await page
    .getByLabel('Choose public PEM file')
    .setInputFiles('receiver/tests/fixtures/keys/openssl-3.5-4096-public.pem');
  await expect(page.locator('.recipient-summary')).toContainText('RSA-4096');
  await page.getByLabel('Message', { exact: true }).fill('x'.repeat(65536));
  await page
    .getByRole('button', { name: 'Encrypt message', exact: true })
    .click();
  const raw = await page.getByLabel('Raw ciphertext').inputValue();
  expect(raw).toHaveLength(88102);
  await expect(page.locator('#result-display')).toBeVisible();
  await expect(
    page.locator('.glyph-plate .glyph-cell[data-character]'),
  ).toHaveCount(512);
  await expect(page.locator('.glyph-plate .glyph-cell')).toHaveCount(576);
  await page
    .getByRole('button', { name: 'Last glyph page', exact: true })
    .click();
  await expectGridStart(page);
  await expect(
    page.locator('.glyph-plate .glyph-cell[data-character]'),
  ).toHaveCount(38);
  await expect(page.locator('.glyph-plate .glyph-cell')).toHaveCount(42);
  expect(
    await page
      .locator('.glyph-plate .glyph-cell[data-character]')
      .evaluateAll((items) =>
        items.map((item) => item.getAttribute('data-character')).join(''),
      ),
  ).toBe(raw.slice(88064));
  await expect(
    page.getByText('Preview 173 of 173', { exact: false }),
  ).toBeVisible();
  expect(
    await page.locator('.glyph-plate svg, .glyph-legend svg').count(),
  ).toBeLessThanOrEqual(1024);
  const event = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download ciphertext (.txt)', exact: true })
    .click();
  const file = await event,
    path = await file.path();
  expect(readFileSync(path!, 'utf8')).toBe(raw);
  await page
    .getByRole('button', { name: 'First glyph page', exact: true })
    .click();
  expect(
    await page
      .locator('.glyph-plate .glyph-cell')
      .first()
      .getAttribute('data-offset'),
  ).toBe('0');
});

test('raw recovery cleans only by explicit choice, refuses imports and interoperates with native receiver', async ({
  page,
}) => {
  await page.goto('/');
  const plaintext = 'Nonsecret recovery: שלום 🔑  ';
  await page.getByLabel('Message', { exact: true }).fill(plaintext);
  await page
    .getByRole('button', { name: 'Encrypt message', exact: true })
    .click();
  const raw = await page.getByLabel('Raw ciphertext').inputValue();
  await page.goto('/restore/');
  // Warm the hydrated island before denying subsequent networking.
  await expect(
    page.getByRole('button', { name: 'Printed rows', exact: true }),
  ).toBeVisible();
  const input = page.getByLabel('Paste raw ciphertext', { exact: true });
  await input.fill(' \t' + raw.slice(0, 40) + '\r\n' + raw.slice(40));
  await page
    .getByRole('button', { name: 'Validate raw ciphertext', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('canonical Base64URL');
  await page
    .getByRole('checkbox', { name: 'Remove ASCII spaces', exact: false })
    .check();
  await page
    .getByRole('button', { name: 'Validate raw ciphertext', exact: true })
    .click();
  const output = page.getByLabel('Recovered raw ciphertext', { exact: true });
  await expect(output).toHaveValue(raw);
  await expect(
    page.getByRole('heading', {
      name: 'Validated raw ciphertext',
      exact: true,
    }),
  ).toBeFocused();
  const directory = mkdtempSync(join(tmpdir(), 'zodiac-recovery-synthetic-'));
  try {
    const request = join(directory, 'request.json');
    writeFileSync(
      request,
      JSON.stringify({
        Raw: await output.inputValue(),
        Bits: '3072',
        Plaintext: plaintext,
        Expected: 0,
      }),
    );
    const command = spawnSync(
      resolve('artifacts/receiver-command-tests.exe'),
      ['-test.run=^TestBrowserNativeCLI$', '-test.timeout=20s'],
      {
        cwd: resolve('receiver/cmd/zodiac-decrypt'),
        encoding: 'utf8',
        windowsHide: true,
        env: { ...process.env, ZODIAC_TEST_BROWSER_REQUEST: request },
      },
    );
    expect(command.status, command.stdout + command.stderr).toBe(0);
    const download = page.waitForEvent('download');
    await page
      .getByRole('button', {
        name: 'Download recovered ciphertext (.txt)',
        exact: true,
      })
      .click();
    const file = await download;
    await file.saveAs(join(directory, 'ciphertext.txt'));
    expect(readFileSync(join(directory, 'ciphertext.txt'), 'utf8')).toBe(raw);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  await input.fill(raw + '=');
  await expect(output).toHaveCount(0);
  await page.getByLabel('Choose raw ciphertext .txt').setInputFiles({
    name: 'malicious.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
  });
  await expect(page.getByRole('alert')).toContainText('cannot be imported');
  await page.getByLabel('Choose raw ciphertext .txt').setInputFiles({
    name: 'raw.txt',
    mimeType: 'text/plain',
    buffer: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(raw)]),
  });
  await page
    .getByRole('button', { name: 'Validate raw ciphertext', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page
    .getByRole('button', { name: 'Clear recovery', exact: true })
    .click();
  await expect(input).toHaveValue('');
  await page.reload();
  await expect(input).toHaveValue('');
});

test('printed rows localize errors, require complete ordered pages and verify final raw without networking/storage', async ({
  page,
}) => {
  const raw = Buffer.alloc(438).toString('base64url');
  const data = await bundle(raw),
    [first, second] = data.pages;
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { violations: string[] }).violations.push(
        e.violatedDirective,
      ),
    );
  });
  await page.goto('/restore/');
  // The production island must finish hydration before runtime network denial.
  await expect(
    page.getByRole('button', { name: 'Printed rows', exact: true }),
  ).toBeVisible();
  const requests: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('http://**/*', (route) => route.abort());
  await page.getByRole('button', { name: 'Printed rows', exact: true }).click();
  await page
    .getByLabel('Printed whole-envelope SHA-256')
    .fill(data.context.envelopeSHA256);
  await page.getByLabel('Printed recipient fingerprint').fill(fingerprint);
  await page
    .getByLabel('Printed total raw characters')
    .fill(String(raw.length));
  const input = page.getByLabel('Printed rows: row number');
  const check = page.getByRole('button', {
    name: 'Check rows / add complete page',
    exact: true,
  });
  await input.fill(
    `13 B${first!.rows[12]!.raw.slice(1)} ${first!.rows[12]!.checkCode}`,
  );
  await check.click();
  await expect(page.getByRole('alert')).toContainText(
    'Page 1, row 13: check mismatch',
  );
  await input.fill(`13 ${first!.rows[12]!.raw} ${first!.rows[12]!.checkCode}`);
  await check.click();
  await expect(page.getByRole('status')).toContainText('1 row checks pass');
  await expect(page.getByLabel('Recovered raw ciphertext')).toHaveCount(0);
  await input.fill(rows(first!));
  await page.getByLabel('Printed page check').fill('0'.repeat(12));
  await check.click();
  await expect(page.getByRole('alert')).toContainText('Rows pass');
  await page.getByLabel('Printed page check').fill(first!.digest.slice(0, 12));
  await check.click();
  await expect(page.getByRole('status')).toContainText('1 of 2 pages added');
  await expect(page.getByLabel('Recovered raw ciphertext')).toHaveCount(0);
  await page.getByLabel('Printed page number').fill('2');
  await page.getByLabel('Printed page check').fill(second!.digest.slice(0, 12));
  await input.fill(rows(second!));
  await check.click();
  await expect(page.getByLabel('Recovered raw ciphertext')).toHaveValue(raw);
  expect(data.context.envelopeSHA256).toBe(
    createHash('sha256').update(Buffer.alloc(438)).digest('hex'),
  );
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.locator('[style]').count()).toBe(0);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      violations: (window as unknown as { violations: string[] }).violations,
    })),
  ).toEqual({ local: 0, session: 0, violations: [] });
  await page.getByLabel('Printed recipient fingerprint').fill('cd'.repeat(32));
  await expect(page.getByLabel('Recovered raw ciphertext')).toHaveCount(0);
  await expect(
    page.getByText('Added pages: 0.', { exact: false }),
  ).toBeVisible();
});
