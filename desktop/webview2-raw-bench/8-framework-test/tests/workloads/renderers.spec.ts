import { test, expect } from '@playwright/test';
import type { WorkloadAPI } from '../../packages/test-support/src/workloads';
import { allowedDialogMetadata } from '../../packages/design/src/style-policy';
declare global { interface Window { neutronstarWorkload?: WorkloadAPI } }
for (const app of ['vanilla', 'svelte', 'react', 'vue', 'solid', 'lit', 'preact', 'alpine', 'htmx']) {
  test(`${app}: list identity, input under updates, remount and control soak`, async ({ page }) => {
    const errors: string[] = [], remote: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (/violates.*content security policy/i.test(m.text())) errors.push(m.text()); });
    page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:4178/')) remote.push(r.url()); });
    await page.goto(`http://127.0.0.1:4178/${app}/`);
    await expect(page.locator('#status')).toHaveText('Ready');
    const rows = page.locator('#workload-rows > li');
    await expect(rows).toHaveCount(1000);
    // Identity is compared across a reorder, not just equivalent text output.
    const first = await rows.first().elementHandle();
    await page.evaluate(() => window.neutronstarWorkload!.reverse());
    await expect(rows.last()).toHaveAttribute('data-id', '0');
    expect(await first!.evaluate(node => node === document.querySelector('#workload-rows > li:last-child'))).toBe(true);
    await page.evaluate(() => window.neutronstarWorkload!.splice());
    await expect(rows).toHaveCount(1000);
    await expect(rows.first()).toHaveAttribute('data-id', '1000');
    await page.evaluate(() => window.neutronstarWorkload!.burst(30, 600));
    const input = page.getByRole('searchbox', { name: 'Filter synthetic rows' });
    await input.pressSequentially('row-1000', { delay: 10 });
    await expect(rows).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => window.neutronstarWorkload!.snapshot().tick)).toBeGreaterThan(0);
    await expect(rows.first()).toContainText(/: [1-9]\d*$/);
    await expect(input).toHaveValue('row-1000');
    await input.fill('שלום'); await expect(rows).toHaveCount(1000);
    await input.fill('row-'); await expect(rows).toHaveCount(1000);
    await input.fill('no-match'); await expect(rows).toHaveCount(0);
    await page.evaluate(() => window.neutronstarWorkload!.stop());
    // Observe quiescence while detached: an old timer must not reach a new store.
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => { window.neutronstarWorkload!.burst(30, 600); window.neutronstarWorkload!.remount(); });
      await expect(rows).toHaveCount(1000);
    }
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.neutronstarWorkload!.snapshot().tick)).toBe(0);
    await expect(page.locator('#workload-query')).toHaveCount(1);
    await page.evaluate(() => window.neutronstarWorkload!.replace(10000));
    await expect(rows).toHaveCount(10000);
    await page.evaluate(() => window.neutronstarWorkload!.replace(1000));
    await expect(rows).toHaveCount(1000);
    // Existing Ark/Zag controls: short correctness soak, not a timing benchmark.
    for (let i = 0; i < 5; i++) {
      await page.locator('#about-trigger').click();
      await expect(page.getByRole('dialog', { name: 'About this test' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#about-trigger')).toBeFocused();
      await page.locator('#encrypt').click();
      await expect(page.locator('#cancel')).toBeVisible();
      await page.locator('#cancel').click();
      await page.locator('#reset').click();
      await expect(page.locator('#status')).toHaveText('Ready');
    }
    const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
    expect(storage).toEqual({ local: 0, session: 0 });
    const styles = await page.locator('[style]').evaluateAll(elements => elements.map(el => ({
      id: el.id, scope: el.getAttribute('data-scope'), part: el.getAttribute('data-part'), value: el.getAttribute('style'),
    })));
    expect(styles.every(s => allowedDialogMetadata(s.id, s.scope, s.part, s.value))).toBe(true);
    await page.evaluate(() => window.neutronstarWorkload!.dispose());
    await expect(page.locator('#workload-harness')).toHaveCount(0);
    expect(errors).toEqual([]); expect(remote).toEqual([]);
  });
}
