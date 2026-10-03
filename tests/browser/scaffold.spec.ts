import { expect, test } from '@playwright/test';
test('static scaffold hydrates under enforced production headers', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as unknown as { cspFailures: string[] }).cspFailures ??= [];
      (window as unknown as { cspFailures: string[] }).cspFailures.push(
        event.violatedDirective,
      );
    });
  });
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain(
    "style-src-attr 'none'",
  );
  expect(response?.headers()['content-security-policy']).toContain(
    "worker-src 'none'",
  );
  await page.getByRole('button', { name: 'Recipient details' }).click();
  await expect(page.locator('.fingerprint')).toContainText('RSA-3072');
  expect(await page.locator('[style]').count()).toBe(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { cspFailures?: string[] }).cspFailures ?? [],
    ),
  ).toEqual([]);
  expect(failures).toEqual([]);
  await page.keyboard.press('Tab');
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ media: 'print' });
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }),
  ).toBeHidden();
});
test('static fallback explains capabilities with JavaScript disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4321/');
    await expect(
      page.getByText('The sender requires JavaScript and native WebCrypto.', {
        exact: false,
      }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
