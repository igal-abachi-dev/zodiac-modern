import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const pem = (bits: number) =>
  readFileSync(
    `receiver/tests/fixtures/keys/openssl-3.5-${bits}-public.pem`,
    'utf8',
  );
async function custom(page: Page, bits: number) {
  await page.getByLabel('Paste public PEM').fill(pem(bits));
  await page
    .getByRole('button', { name: 'Use pasted public key', exact: true })
    .click();
  await expect(page.getByLabel('Paste public PEM')).toHaveValue('');
}
function command(raw: string, bits: number, plaintext: string, expected = 0) {
  const directory = mkdtempSync(join(tmpdir(), 'zodiac-browser-synthetic-'));
  try {
    const path = join(directory, 'request.json');
    writeFileSync(
      path,
      JSON.stringify({
        Raw: raw,
        Bits: String(bits),
        Plaintext: plaintext,
        Expected: expected,
      }),
    );
    const result = spawnSync(
      resolve('artifacts/receiver-command-tests.exe'),
      ['-test.run=^TestBrowserNativeCLI$', '-test.timeout=20s'],
      {
        cwd: resolve('receiver/cmd/zodiac-decrypt'),
        windowsHide: true,
        encoding: 'utf8',
        env: { ...process.env, ZODIAC_TEST_BROWSER_REQUEST: path },
      },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
test('sender exact bytes, command interoperability, exports, immutable recipient and reset', async ({
  page,
}) => {
  const failures: string[] = [],
    requests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { violations: string[] }).violations.push(
        e.violatedDirective,
      ),
    );
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Encrypt message', exact: true }),
  ).toBeEnabled();
  page.on('request', (r) => requests.push(r.url()));
  for (const bits of [3072, 4096]) {
    if (bits === 4096) await custom(page, bits);
    const plaintext = '  שלום العربية 🔑 e\u0301\n\tend ';
    const message = page.getByLabel('Message', { exact: true });
    await message.fill(plaintext);
    await expect(message).toHaveAttribute('dir', 'auto');
    await expect(message).toHaveAttribute('autocomplete', 'off');
    await expect(page.locator('#message-count')).toContainText(
      String(Buffer.byteLength(plaintext)),
    );
    await message.press('Control+Enter');
    await expect(
      page.getByRole('heading', { name: 'Encrypted message', exact: true }),
    ).toBeFocused();
    expect(await message.count()).toBe(0);
    await expect(page.getByLabel('Paste public PEM')).toBeDisabled();
    const raw = await page.getByLabel('Raw ciphertext').inputValue();
    command(raw, bits, plaintext);
    for (const offset of [0, bits / 8, bits / 8 + 12, bits / 8 + 28]) {
      const mutant = Buffer.from(raw, 'base64url');
      mutant[offset] = mutant[offset]! ^ 1;
      command(mutant.toString('base64url'), bits, '', 4);
    }
    const download = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Download ciphertext (.txt)', exact: true })
      .click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('ciphertext.txt');
    expect(readFileSync((await file.path())!, 'utf8')).toBe(raw);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw Error('synthetic denial');
          },
        },
      });
    });
    await page.getByRole('button', { name: 'Copy raw', exact: true }).click();
    await expect(page.getByLabel('Raw ciphertext')).toBeFocused();
    expect(
      await page
        .getByLabel('Raw ciphertext')
        .evaluate(
          (el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart,
        ),
    ).toBe(raw.length);
    await page
      .getByRole('button', { name: 'Encrypt another message', exact: true })
      .click();
    await expect(message).toHaveValue('');
    await expect(message).toBeFocused();
    await expect(page.getByLabel('Paste public PEM')).toBeEnabled();
  }
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Recipient details', exact: true })
    .click();
  await expect(page.locator('.full-fingerprint')).toContainText('RSA-3072');
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
  expect(requests).toEqual([]);
  expect(errors).toEqual(failures);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      history: history.state,
      violations: (window as unknown as { violations: string[] }).violations,
      styles: document.querySelectorAll('[style]').length,
    })),
  ).toEqual({ local: 0, session: 0, history: null, violations: [], styles: 0 });
});

test('input boundaries, IME, failures, clear while pending and navigation discard', async ({
  page,
}) => {
  await page.goto('/');
  const message = page.getByLabel('Message', { exact: true });
  const encrypt = page.getByRole('button', {
    name: 'Encrypt message',
    exact: true,
  });
  await expect(encrypt).toBeEnabled();
  await encrypt.click();
  await expect(page.getByRole('alert')).toContainText('Enter a message');
  await message.fill('🔑'.repeat(16385));
  await encrypt.click();
  await expect(page.getByRole('alert')).toContainText('65,536');
  await message.evaluate((el: HTMLTextAreaElement) => {
    el.value = '\ud800';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await encrypt.click();
  await expect(page.getByRole('alert')).toContainText('surrogate');
  await message.fill('synthetic');
  await message.dispatchEvent('keydown', {
    key: 'Enter',
    ctrlKey: true,
    isComposing: true,
  });
  await expect(message).toHaveValue('synthetic');
  await message.press('Enter');
  await expect(message).toHaveValue('synthetic\n');
  // Failure and latency adapters wrap the native primitive; other interop cases use it unmodified.
  await page.evaluate(() => {
    const real = crypto.subtle.encrypt.bind(crypto.subtle);
    Object.defineProperty(crypto.subtle, 'encrypt', {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto['encrypt']>) => {
        if ((args[0] as Algorithm).name === 'AES-GCM')
          throw Error('synthetic secret-looking diagnostic');
        return real(...args);
      },
    });
  });
  await encrypt.click();
  await expect(page.getByRole('alert')).toContainText('Unable to encrypt');
  await expect(message).toHaveValue('synthetic\n');
  await page.reload();
  await expect(encrypt).toBeEnabled();
  await expect(message).toHaveValue('');
  await page.evaluate(() => {
    const real = crypto.subtle.encrypt.bind(crypto.subtle);
    Object.defineProperty(crypto.subtle, 'encrypt', {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto['encrypt']>) => {
        await new Promise((r) => setTimeout(r, 250));
        return real(...args);
      },
    });
  });
  await message.fill('discard this synthetic draft');
  await encrypt.click();
  await expect(message).toBeDisabled();
  await expect(page.getByLabel('Paste public PEM')).toBeDisabled();
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  await expect(message).toHaveValue('');
  await page.waitForTimeout(600);
  await expect(page.locator('#result-title')).toHaveCount(0);
  await message.fill('discard on navigation');
  await page.getByRole('link', { name: 'Keys', exact: true }).click();
  await page.goBack();
  await expect(message).toHaveValue('');
  await expect(page.locator('#result-title')).toHaveCount(0);
});

test('custom-only clear and unavailable WebCrypto have no fallback', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4322/');
  const encrypt = page.getByRole('button', {
    name: 'Encrypt message',
    exact: true,
  });
  await expect(encrypt).toBeDisabled();
  await custom(page, 4096);
  await expect(encrypt).toBeEnabled();
  await page
    .getByRole('button', { name: 'Clear everything', exact: true })
    .click();
  await expect(encrypt).toBeDisabled();
  await expect(
    page.getByText('No recipient selected.', { exact: true }),
  ).toBeVisible();
  await page.addInitScript(() =>
    Object.defineProperty(window, 'crypto', { value: undefined }),
  );
  await page.reload();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Native WebCrypto' }),
  ).toBeVisible();
  await expect(encrypt).toBeDisabled();
});

test('light/dark contrast, mobile reflow, zoom, focus and print', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'Encrypt message', exact: true }),
    ).toBeEnabled();
    const metrics = await page.evaluate(() => {
      const style = getComputedStyle(document.body),
        panel = getComputedStyle(document.querySelector('.panel')!),
        button = getComputedStyle(document.querySelector('button')!);
      const rgb = (s: string) =>
        s
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const luminance = (s: string) =>
        rgb(s)
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
      const contrast = (a: string, b: string) => {
        const x = luminance(a),
          y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        text: contrast(style.color, style.backgroundColor),
        panel: contrast(panel.color, panel.backgroundColor),
        button: contrast(button.color, button.backgroundColor),
        target: parseFloat(button.minHeight),
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(metrics.text).toBeGreaterThanOrEqual(4.5);
    expect(metrics.panel).toBeGreaterThanOrEqual(4.5);
    expect(metrics.button).toBeGreaterThanOrEqual(4.5);
    expect(metrics.target).toBeGreaterThanOrEqual(44);
    // 200% text zoom with 320px viewport exercises wrapping without stylesheet mutation.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    // Synthetic test styling is removed before CSP/DOM assertions in other tests.
    const zoomOverflow=await page.evaluate(()=>Array.from(document.querySelectorAll('*')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({tag:el.tagName,id:el.id,text:el.textContent?.slice(0,50),right:el.getBoundingClientRect().right})));
    expect(zoomOverflow).toEqual([]);
    await page.reload();
    await page.getByLabel('Message', { exact: true }).focus();
    await expect(page.getByLabel('Message', { exact: true })).toBeFocused();
    await page.emulateMedia({ media: 'print' });
    await expect(
      page.getByRole('button', { name: 'Encrypt message', exact: true }),
    ).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
  }
});
