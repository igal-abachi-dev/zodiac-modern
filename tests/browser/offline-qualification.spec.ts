import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { cpus, release, totalmem } from 'node:os';

type MetricsWindow = typeof window & {
  qualification: { supported: boolean; durations: number[]; started: number };
};

test('maximum-size offline encryption, keyboard gate and responsive paging', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/^https?:/, async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });
  await page.addInitScript(() => {
    const target = window as MetricsWindow;
    target.qualification = {
      supported: PerformanceObserver.supportedEntryTypes.includes('longtask'),
      durations: [],
      started: 0,
    };
    if (target.qualification.supported)
      new PerformanceObserver((list) => {
        target.qualification.durations.push(
          ...list.getEntries().map((entry) => entry.duration),
        );
      }).observe({ type: 'longtask' });
  });
  await page.goto(
    pathToFileURL(
      resolve('artifacts/offline probe שלום/zodiac-synthetic-probe.html'),
    ).href,
  );
  const timings: {
    phase: string;
    rsaBits: number;
    milliseconds: number;
    longTaskAPI: boolean;
    longTasks: number[];
  }[] = [];
  const text =
    process.env.ZODIAC_QUALIFICATION_MULTILINE === '1'
      ? 'שלום🔑\n'.repeat(5041) + 'abc'
      : 'שלום🔑' + 'A'.repeat(65524);
  expect(Buffer.byteLength(text, 'utf8')).toBe(65536);
  for (const bits of [3072, 4096]) {
    await page.setViewportSize({ width: 1280, height: 800 });
    const toggle = page.getByRole('button', {
      name: 'Use a custom public key',
      exact: true,
    });
    if ((await toggle.getAttribute('aria-expanded')) === 'false') {
      await toggle.focus();
      await page.keyboard.press('Enter');
    }
    const pem = readFileSync(
      `receiver/tests/fixtures/keys/openssl-3.5-${bits}-public.pem`,
      'utf8',
    );
    await page.getByLabel('Paste public PEM').fill(pem);
    const useKey = page.getByRole('button', {
      name: 'Use pasted public key',
      exact: true,
    });
    await useKey.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.recipient-summary')).toContainText(
      `RSA-${bits}`,
    );
    const confirmation = page.locator('.compare-confirmation input');
    await expect(confirmation).not.toBeChecked();
    await page.getByLabel('Message', { exact: true }).fill(text);
    const encrypt = page.getByRole('button', {
      name: 'Encrypt message',
      exact: true,
    });
    await expect(encrypt).toBeDisabled();
    await confirmation.focus();
    await page.keyboard.press('Space');
    await expect(confirmation).toBeChecked();
    // Exercise ordinary editing; bulk replacement has a separate native control.
    const message = page.getByLabel('Message', { exact: true });
    await message.focus();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.insertText('x');
    await expect(message).toHaveValue(text + 'x');
    await encrypt.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toContainText('65,536');
    await expect(page.locator('#raw-ciphertext')).toHaveCount(0);
    await message.focus();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.press('Backspace');
    await expect(message).toHaveValue(text);
    await expect(encrypt).toBeEnabled();
    await encrypt.focus();
    await page.evaluate(() => {
      const metric = (window as MetricsWindow).qualification;
      metric.durations = [];
      metric.started = performance.now();
    });
    await page.keyboard.press('Enter');
    await expect(page.locator('#raw-ciphertext')).toBeVisible();
    await expect(page.locator('#result-title')).toBeFocused();
    const encrypted = await page.evaluate(() => {
      const m = (window as MetricsWindow).qualification;
      return {
        milliseconds: performance.now() - m.started,
        longTaskAPI: m.supported,
        longTasks: [...m.durations],
      };
    });
    timings.push({
      phase: '64KiB-encrypt-and-first-page',
      rsaBits: bits,
      ...encrypted,
    });
    const raw = await page.getByLabel('Raw ciphertext').inputValue();
    expect(await page.locator('.glyph-plate [data-character]').count()).toBe(
      512,
    );
    expect(await page.locator('.glyph-plate [data-kind="null"]').count()).toBe(
      64,
    );
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
        'file:' +
          resolve('receiver/tests/fixtures/keys/synthetic-password.txt'),
        '-outform',
        'DER',
      ],
      { windowsHide: true },
    );
    expect(key.status).toBe(0);
    try {
      const oracle = spawnSync(resolve('artifacts/interop-oracle.exe'), [], {
        encoding: 'utf8',
        windowsHide: true,
        input: JSON.stringify({
          Mode: 'decrypt',
          PrivateDER: key.stdout.toString('base64'),
          Raw: raw,
        }),
      });
      expect(oracle.status).toBe(0);
      expect(
        Buffer.from(JSON.parse(oracle.stdout).result, 'base64').toString(
          'utf8',
        ),
      ).toBe(text);
    } finally {
      key.stdout.fill(0);
    }
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const next = page.getByRole('button', {
        name: 'Next glyph page',
        exact: true,
      });
      await next.focus();
      await page.evaluate(() => {
        const m = (window as MetricsWindow).qualification;
        m.durations = [];
        m.started = performance.now();
      });
      await page.keyboard.press('Enter');
      await expect(
        page.locator('.glyph-plate [data-offset="512"]'),
      ).toHaveCount(1);
      await expect
        .poll(() =>
          page
            .locator('.glyph-plate')
            .evaluate((node) => Math.abs(node.getBoundingClientRect().top)),
        )
        .toBeLessThan(160);
      const paging = await page.evaluate(() => {
        const m = (window as MetricsWindow).qualification;
        return {
          milliseconds: performance.now() - m.started,
          longTaskAPI: m.supported,
          longTasks: [...m.durations],
        };
      });
      timings.push({ phase: `next-page-${width}px`, rsaBits: bits, ...paging });
      await page
        .getByRole('button', { name: 'First glyph page', exact: true })
        .focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.glyph-plate [data-offset="0"]')).toHaveCount(
        1,
      );
    }
    const pending = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Download ciphertext (.txt)', exact: true })
      .click();
    const downloaded = await pending;
    expect(readFileSync((await downloaded.path())!, 'utf8')).toBe(raw);
    await page
      .getByRole('button', { name: 'Encrypt another message', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  }
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  expect(await page.locator('[style]').count()).toBe(0);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await testInfo.attach('offline-qualification', {
    contentType: 'application/json',
    body: JSON.stringify(
      {
        recorded: new Date().toISOString(),
        browser: page.context().browser()!.version(),
        project: testInfo.project.name,
        system: {
          cpu: cpus()[0]?.model,
          memoryBytes: totalmem(),
          release: release(),
        },
        scope:
          'Author-run desktop headless keyboard/responsive/max-byte checks. Not human accessibility, actual mobile, reference-device qualification or independent review. Long Task API availability recorded; unsupported is not zero long tasks. Timings include automation/paint waiting.',
        input: {
          utf8Bytes: Buffer.byteLength(text, 'utf8'),
          lines: text.split('\n').length,
          boundaryEditing: 'append/backspace',
        },
        timings,
      },
      null,
      2,
    ),
  });
});

// Diagnostic control: excludes Svelte/workspace/crypto to isolate native editing.
test('native textarea multiline replacement control', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.ZODIAC_INPUT_CONTROL !== '1',
    'Opt-in input diagnostic.',
  );
  const text = 'שלום🔑\n'.repeat(5041) + 'abc';
  const direction =
    process.env.ZODIAC_INPUT_DIRECTION === 'ltr' ? 'ltr' : 'auto';
  await page.setContent(
    `<label for="control">Control</label><textarea id="control" dir="${direction}" maxlength="65537" spellcheck="false"></textarea>`,
  );
  const input = page.getByLabel('Control', { exact: true });
  const started = Date.now();
  await input.fill(text, { timeout: 15000 });
  const initialMilliseconds = Date.now() - started;
  const replaced = Date.now();
  await input.fill(text + 'x', { timeout: 15000 });
  await expect(input).toHaveValue(text + 'x');
  await testInfo.attach('native-input-control', {
    contentType: 'application/json',
    body: JSON.stringify({
      browser: page.context().browser()!.version(),
      direction,
      bytes: Buffer.byteLength(text, 'utf8'),
      lines: 5042,
      initialMilliseconds,
      replacementMilliseconds: Date.now() - replaced,
      scope:
        'Synthetic native-textarea control; excludes application code. Not a human usability result.',
    }),
  });
});
