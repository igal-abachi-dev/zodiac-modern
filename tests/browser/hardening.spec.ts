import { test, expect } from '@playwright/test';

test('security policy actively blocks injected script, connection and worker without weakening normal sender', async ({
  page,
}) => {
  const requests: string[] = [];
  await page.goto('/');
  await expect(page.getByLabel('Message', { exact: true })).toBeEnabled();
  page.on('request', (r) => requests.push(r.url()));
  await page.evaluate(async () => {
    const state = window as unknown as {
      blockedDirectives: string[];
      injected?: boolean;
    };
    state.blockedDirectives = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      state.blockedDirectives.push(e.effectiveDirective),
    );
    const script = document.createElement('script');
    script.textContent = 'window.injected = true';
    document.body.append(script);
    script.remove();
    await fetch('https://synthetic-blocked.invalid/').catch(() => {});
    const url = URL.createObjectURL(
      new Blob(['self.close()'], { type: 'text/javascript' }),
    );
    try {
      const worker = new Worker(url);
      worker.terminate();
    } catch {
      /* Expected policy refusal. */
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { blockedDirectives: string[] })
            .blockedDirectives,
      ),
    )
    .toEqual(
      expect.arrayContaining(['script-src-elem', 'connect-src', 'worker-src']),
    );
  expect(
    await page.evaluate(
      () => (window as unknown as { injected?: boolean }).injected,
    ),
  ).toBeUndefined();
  expect(requests).toEqual([]);
  await page
    .getByLabel('Message', { exact: true })
    .fill('Synthetic still-functional sender');
  await page
    .getByRole('button', { name: 'Encrypt message', exact: true })
    .click();
  await expect(page.getByLabel('Raw ciphertext')).toBeVisible();
});

test('all public guidance routes use exact production headers and honest current trust disclosures', async ({
  page,
}, info) => {
  for (const route of [
    '/how-it-works/',
    '/privacy/',
    '/security/',
    '/keys/',
    '/receive/',
    '/restore/',
  ]) {
    const response = await page.goto(route);
    expect(response!.status()).toBe(200);
    const headers = response!.headers();
    expect(headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers['content-security-policy']).toContain(
      "style-src-attr 'none'",
    );
    expect(headers['content-security-policy']).not.toMatch(
      /unsafe-inline|unsafe-eval|report-uri|report-to/,
    );
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(await page.locator('[style]').count()).toBe(0);
    await page.setViewportSize({ width: 320, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (route === '/privacy/') {
      await expect(
        page.getByRole('heading', { name: 'Your workspace stays in this tab' }),
      ).toBeVisible();
      expect(await page.locator('main').innerText()).not.toContain(
        'planned sender',
      );
    }
    if (route === '/security/') {
      await expect(
        page.getByText('https://zodiac-modern.vercel.app', { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByText('Pending; no signed receiver release available.'),
      ).toBeVisible();
      await page.screenshot({
        path: `artifacts/m4/security-${info.project.name}-320.png`,
        fullPage: true,
      });
    }
  }
});
