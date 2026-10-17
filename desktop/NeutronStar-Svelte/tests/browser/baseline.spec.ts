import { test, expect } from '@playwright/test';
import { allowedDialogMetadata } from '../../packages/design/src/style-policy';

test('production CSP, readiness, workflow, dialog focus and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    (window as any).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => (window as any).__cspViolations.push(event.violatedDirective));
  });
  await page.goto('http://127.0.0.1:4188/');
  const status = page.locator('#status');
  await expect(status).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('#encrypt')).toBeEnabled();
  await expect(page.locator('#decrypt')).toBeEnabled();
  await page.getByRole('button', { name: 'About this test' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (const item of await page.locator('[style]').evaluateAll((nodes) => nodes.map((n) => ({ id: n.id, scope: n.getAttribute('data-scope'), part: n.getAttribute('data-part'), style: n.getAttribute('style') })))) {
    expect(allowedDialogMetadata(item.id, item.scope, item.part, item.style)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'About this test' })).toBeFocused();
  await page.locator('#encrypt').click();
  await expect(status).toHaveAttribute('data-status', 'running');
  await expect(status).toHaveAttribute('data-status', 'success', { timeout: 8000 });
  await page.locator('#reset').click();
  await page.locator('#decrypt').click();
  await page.locator('#cancel').click();
  await expect(status).toHaveAttribute('data-status', 'canceled');
  await page.reload();
  await expect(status).toHaveAttribute('data-status', 'ready');
  expect(await page.evaluate(() => (window as any).__cspViolations)).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(errors).toEqual([]);
});
