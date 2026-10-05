import { expect, type Page } from '@playwright/test';

export async function openCustomKey(page: Page) {
  const toggle = page.getByRole('button', {
    name: 'Use a custom public key',
    exact: true,
  });
  await expect(toggle).toBeEnabled();
  if ((await toggle.getAttribute('aria-expanded')) === 'false')
    await toggle.click();
}
