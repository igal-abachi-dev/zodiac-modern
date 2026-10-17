import { test, expect } from '@playwright/test';
import { entryTypes } from '../../packages/test-support/src/diagnostics';
import type { startDiagnostics } from '../../packages/test-support/src/diagnostics';
declare global { interface Window { neutronstarDiagnostics?: ReturnType<typeof startDiagnostics> } }
for (const app of ['vanilla', 'svelte', 'react', 'vue', 'solid', 'lit', 'preact', 'alpine', 'htmx']) {
  test(`${app}: diagnostic API, bounded schema and stop lifecycle`, async ({ page }) => {
    const errors: string[] = [], remote: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (/violates.*content security policy/i.test(message.text())) errors.push(message.text()); });
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4178/')) remote.push(request.url()); });
    await page.goto(`http://127.0.0.1:4178/${app}/`);
    await expect(page.locator('#status')).toHaveText('Ready');
    const initial = await page.evaluate(() => window.neutronstarDiagnostics!.snapshot());
    expect(initial.diagnosticOnly).toBe(true);
    expect(Object.keys(initial.observerStatus)).toEqual([...entryTypes]);
    expect(initial.stoppedAt).toBeNull();
    if (initial.observerStatus.paint === 'observing') {
      await expect.poll(() => page.evaluate(() => window.neutronstarDiagnostics!.snapshot().provisional.fcpMs)).not.toBeNull();
    }
    await page.locator('#about-trigger').click();
    await expect(page.getByRole('dialog', { name: 'About this test' })).toBeVisible();
    await page.keyboard.press('Escape');
    const stopped = await page.evaluate(() => window.neutronstarDiagnostics!.stop());
    expect(stopped.stopReason).toBe('explicit');
    expect(stopped.stoppedAt).not.toBeNull();
    expect(stopped.entries.length).toBeLessThanOrEqual(512);
    expect(stopped.entries.every(e => Number.isFinite(e.startTime) && Number.isFinite(e.duration))).toBe(true);
    // Snapshot readers cannot mutate retained observations, and stop is idempotent.
    const entries = stopped.entries;
    await page.locator('#about-trigger').click();
    await page.keyboard.press('Escape');
    expect((await page.evaluate(() => window.neutronstarDiagnostics!.stop())).entries).toEqual(entries);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
    expect(errors).toEqual([]); expect(remote).toEqual([]);
    // These are collection-correctness probes, not saved comparative timing samples.
  });
}
