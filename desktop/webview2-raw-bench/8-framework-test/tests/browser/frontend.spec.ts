import { test, expect } from '@playwright/test';
import {allowedDialogMetadata} from '../../packages/design/src/style-policy';
for (const app of [
  'vanilla',
  'svelte',
  'react',
  'vue',
  'solid',
  'lit',
  'preact',
  'alpine',
  'htmx',
]) {
  test(`${app}: keyboard, dialog, actions, themes, layout and reload`, async ({
    page,
  }) => {
    const failures: string[] = [];
    // Install before any module executes. Empty storage at the end alone misses
    // write-then-remove probes (the original htmx behavior).
    await page.addInitScript(() => {
      const writes: string[] = [];
      Object.defineProperty(window, '__storageWrites', { value: writes });
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        writes.push(key);
        return original.call(this, key, value);
      };
    });
    page.on('pageerror', (e) => failures.push(e.message));
    page.on('console',message=>{if(/violates.*content security policy/i.test(message.text()))failures.push(message.text());});
    const remote: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1:4178/')) remote.push(r.url());
    });
    await page.goto(`http://127.0.0.1:4178/${app}/`);
    await expect(page.locator('#status')).toHaveText('Ready');
    await expect(page.locator('#fixture-text')).toHaveText(
      'Zodiac GUI benchmark — שלום — مرحبًا — 🌠',
    );
    await page.locator('#about-trigger').focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'About this test' });
    await expect(dialog).toBeVisible();
    const styles=await page.locator('[style]').evaluateAll(elements=>elements.map(el=>({id:el.id,scope:el.getAttribute('data-scope'),part:el.getAttribute('data-part'),value:el.getAttribute('style')})));
    expect(styles.every(s=>allowedDialogMetadata(s.id,s.scope,s.part,s.value))).toBeTruthy();
    await expect(page.locator('#about-close')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#about-close')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#about-close')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.locator('#about-trigger')).toBeFocused();
    await page
      .getByRole('button', { name: 'Simulate encryption', exact: true })
      .click();
    await expect(page.locator('#decrypt')).toBeDisabled();
    await expect(page.getByRole('progressbar')).not.toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('#status')).toHaveText('Simulation canceled.');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.locator('#status')).toHaveText('Ready');
    await page
      .getByRole('button', { name: 'Simulate decryption', exact: true })
      .click();
    await expect(page.locator('#status')).toHaveText(
      'Simulation complete. No file was changed.',
    );
    await page.setViewportSize({ width: 640, height: 800 });
    const left = await page.locator('#decrypt-title').boundingBox(),
      right = await page.locator('#encrypt-title').boundingBox();
    expect(left && right && right.y > left.y).toBeTruthy();
    await page.emulateMedia({
      reducedMotion: 'reduce',
      forcedColors: 'active',
    });
    await expect(page.locator('#reset')).toBeVisible();
    await page.emulateMedia({ forcedColors: 'none' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    expect(
      await page
        .locator('html')
        .evaluate((el) => getComputedStyle(el).colorScheme),
    ).toBe('dark');
    await page.setViewportSize({ width: 960, height: 640 });
    expect(await page.evaluate(() => (window as unknown as { __storageWrites: string[] }).__storageWrites)).toEqual([]);
    await page.reload();
    await expect(page.locator('#status')).toHaveText('Ready');
    expect(
      (await page.locator('html').getAttribute('class')) ?? '',
    ).not.toContain('dark');
    await page.screenshot({ path: `.cache/screenshots/${app}-light.png` });
    expect(
      await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
      })),
    ).toEqual({ local: 0, session: 0 });
    expect(failures).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __storageWrites: string[] }).__storageWrites)).toEqual([]);
    expect(remote).toEqual([]);
  });
}
