import { bench } from '@neutronstar/bench-contract';
import { fixture } from '@neutronstar/bench-domain';
import { allowedDialogMetadata } from '@neutronstar/design';
const check = (ok: unknown, name: string): void => {
  if (!ok) throw new Error(name);
};
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function until(test: () => boolean, limit = 7000) {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > limit)
      throw new Error('UI condition timed out');
    await delay(20);
  }
}
export async function selfTest(extraChecks?: () => Promise<void>): Promise<void> {
  let violations = 0,
    invalidStyleWrites = 0,
    errors = 0;
  document.addEventListener('securitypolicyviolation', () => violations++);
  window.addEventListener('error', () => errors++);
  window.addEventListener('unhandledrejection', () => errors++);
  const validStyle = (el: Element, value: string | null) =>
    allowedDialogMetadata(
      el.id,
      el.getAttribute('data-scope'),
      el.getAttribute('data-part'),
      value,
    );
  const observer = new MutationObserver((records) => {
    for (const r of records)
      if (r.type === 'attributes' && r.attributeName === 'style') {
        const el = r.target as Element;
        if (
          !validStyle(el, r.oldValue) ||
          !validStyle(el, el.getAttribute('style'))
        ) {
          invalidStyleWrites++;
          if (invalidStyleWrites <= 3) console.error('Invalid synthetic style mutation',el.id,el.getAttribute('data-scope'),el.getAttribute('data-part'),r.oldValue,el.getAttribute('style'));
        }
      }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['style'],
    subtree: true,
  });
  const get = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const click = async (id: string) => {
    await until(
      () =>
        !!get<HTMLButtonElement>(id) && !get<HTMLButtonElement>(id).disabled,
    );
    get<HTMLButtonElement>(id).click();
  };
  try {
    await until(
      () =>
        bench.state.get().loaded &&
        get('status')?.textContent?.trim() === 'Ready',
    );
    check(
      get('fixture-text').textContent === fixture.text,
      'Exact multilingual fixture',
    );
    check(document.querySelectorAll('h1').length === 1, 'One app root');
    check(
      getComputedStyle(document.body).fontFamily.includes('Inter'),
      'Common font',
    );
    check(
      document.images.length >= 6 &&
        Array.from(document.images).every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      'Local icons decoded',
    );
    for (let i = 0; i < 3; i++) {
      get('about-trigger').focus();
      await click('about-trigger');
      await until(
        () =>
          get('about-content').hidden === false &&
          document.activeElement === get('about-close'),
      );
      check(
        get('about-content').getAttribute('aria-modal') === 'true',
        'Composed modal ARIA',
      );
      check(document.querySelector('main')?.inert, 'Background inert');
      check(
        get('about-content').getAttribute('aria-labelledby') === 'about-title',
        'Dialog label',
      );
      if (i % 2 === 0)
        document.activeElement?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            bubbles: true,
            cancelable: true,
          }),
        );
      else await click('about-close');
      await until(
        () =>
          get('about-content').hidden &&
          document.activeElement === get('about-trigger'),
      );
      check(!document.querySelector('main')?.inert, 'Background restored');
    }
    await click('encrypt');
    await until(
      () =>
        get('status').textContent?.includes('Simulating encryption') === true,
    );
    check(
      get<HTMLButtonElement>('decrypt').disabled &&
        get<HTMLButtonElement>('encrypt').disabled,
      'Busy gate',
    );
    await until(
      () =>
        Number(
          document
            .querySelector('[role="progressbar"]')
            ?.getAttribute('aria-valuenow'),
        ) > 0,
    );
    await click('cancel');
    await until(
      () => get('status').textContent?.trim() === 'Simulation canceled.',
    );
    const canceled = bench.state.get().progress;
    await delay(200);
    check(bench.state.get().progress === canceled, 'Canceled timer stopped');
    await click('reset');
    await until(() => get('status').textContent?.trim() === 'Ready');
    await click('decrypt');
    await until(() => bench.state.get().status === 'success');
    await until(
      () =>
        get('status').textContent?.trim() ===
        'Simulation complete. No file was changed.',
    );
    check(
      document
        .querySelector('[role="progressbar"]')
        ?.getAttribute('aria-valuenow') === '100',
      'Completed progress',
    );
    await click('reset');
    await click('encrypt');
    bench.fail();
    await until(
      () =>
        get('status').textContent?.trim() ===
        'Simulation failed. No file was changed.',
    );
    await click('reset');
    await click('encrypt');
    await delay(180);
    await click('reset');
    await click('decrypt');
    await delay(180);
    check(
      bench.state.get().operation === 'decrypt' &&
        bench.state.get().status === 'running',
      'Stale run invalidation',
    );
    await click('cancel');
    await click('reset');
    document.documentElement.classList.add('dark');
    await delay(30);
    check(
      getComputedStyle(document.documentElement).colorScheme === 'dark',
      'Dark tokens',
    );
    document.documentElement.classList.remove('dark');
    await delay(100);
    check(
      document.querySelectorAll('style').length === 0 &&
        Array.from(document.querySelectorAll('[style]')).every((el) =>
          validStyle(el, el.getAttribute('style')),
        ) &&
        invalidStyleWrites === 0,
      'Only approved bounded Zag metadata styles',
    );
    check(
      errors === 0 && violations === 0,
      'No healthy-state errors or CSP violations',
    );
    check(
      localStorage.length === 0 && sessionStorage.length === 0,
      'No application Web Storage',
    );
    await extraChecks?.();
    check(errors === 0 && violations === 0, 'No supplemental errors or CSP violations');
    check(invalidStyleWrites === 0, 'No supplemental style-policy violations');
    observer.disconnect();
    // Existing host smoke contract requires a blocked resource and navigation.
    const forbidden = await fetch('./not-allowed.exe');
    check(forbidden.status === 403, 'MIME policy');
    const missing = await fetch('./missing.js');
    check(missing.status === 404, 'No asset fallback');
    location.href = 'https://example.invalid/blocked';
    await delay(150);
    document.title = 'NeutronStar smoke: PASS';
  } catch (error) {
    observer.disconnect();
    console.error('Synthetic frontend assertion:', error);
    document.title = 'NeutronStar smoke: FAIL';
  }
}
