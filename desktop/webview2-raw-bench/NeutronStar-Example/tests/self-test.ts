import '../src/main';
import { greet } from '../src/native-bridge';

const check = (value: unknown, name: string): void => { if (!value) throw new Error(name); };
const pause = (milliseconds: number): Promise<void> => new Promise(resolve => setTimeout(resolve, milliseconds));
const expected = (name: string): string => `Hello, ${name}! You've been greeted from C++!`;

try {
  const input = document.querySelector<HTMLInputElement>('#greet-input')!;
  const form = document.querySelector<HTMLFormElement>('#greet-form')!;
  const button = form.querySelector<HTMLButtonElement>('button')!;
  const result = document.querySelector<HTMLElement>('#greet-msg')!;
  check(location.origin === 'https://neutronstar.invalid', 'Hosted synthetic origin');
  const response = await fetch('/index.html');
  check(response.ok && response.headers.get('content-security-policy')?.includes("style-src-attr 'none'"), 'Host CSP');
  check(getComputedStyle(document.querySelector('.container')!).display === 'flex', 'External CSS');
  check(getComputedStyle(input).borderRadius === '8px', 'Control styling');
  check(document.body.scrollWidth <= innerWidth, 'No horizontal overflow');
  for (const image of document.images) { await image.decode(); check(image.naturalWidth > 0, 'Local SVG'); }
  for (const name of ['', '  NeutronStar  ', '   ', '\u05e9\u05dc\u05d5\u05dd — \u0645\u0631\u062d\u0628\u0627 — 🚀', '<img src=x onerror=alert(1)>', 'x'.repeat(120)]) {
    input.value = name;
    form.requestSubmit();
    check(button.disabled && form.getAttribute('aria-busy') === 'true', 'Pending UI');
    for (let i = 0; button.disabled && i < 150; ++i) await pause(20);
    check(!button.disabled && result.textContent === expected(name), 'C++ form greeting');
    check(result.children.length === 0, 'Markup remains text');
  }
  check(await greet('A\0B') === expected('A\0B'), 'Embedded NUL native round-trip');
  check(await greet('"\\\n') === expected('"\\\n'), 'Quotes and newline round-trip');
  for (const name of ['x'.repeat(121), '\ud800', '\udc00']) {
    let rejected = false;
    try { await greet(name); } catch { rejected = true; }
    check(rejected, 'Client input bound');
  }
  const webview = (window as Window & { chrome?: { webview?: { postMessage(message: unknown): void } } }).chrome?.webview;
  if (!webview) throw new Error('Native WebView unavailable');
  const prefix = 'neutronstar.test.greet.v1:0123456789abcdef0123456789abcdef:';
  // These must not invoke native application callbacks. The runner verifies counts.
  for (const invalid of [{ name: 'test' }, prefix + 'xyz', prefix + 'd800', prefix + '0078'.repeat(121), 'neutronstar.test.greet.v2:']) webview.postMessage(invalid);
  const active = greet('Busy gate');
  webview.postMessage(prefix); // Native busy gate, not just the client guard.
  let busyRejected = false;
  try { await greet('second'); } catch { busyRejected = true; }
  check(busyRejected && await active === expected('Busy gate'), 'One in-flight greeting');
  const before = result.textContent;
  document.querySelector<HTMLAnchorElement>('.logo-link')!.click();
  await pause(100);
  check(location.hash === '#/about' && !document.querySelector<HTMLElement>('#about')!.hidden, 'Hash route');
  document.querySelector<HTMLAnchorElement>('#about a')!.click();
  await pause(100);
  check(document.querySelector<HTMLElement>('#about')!.hidden && input.value === 'x'.repeat(120) && result.textContent === before, 'Route retains memory');
  check(document.querySelector('label[for="greet-input"]') && result.getAttribute('role') === 'status', 'Label/status semantics');
  check(!document.querySelector('[style],script:not([src]),[onclick],[onsubmit]'), 'External scripts/styles');
  check((await fetch('/missing-example.js')).status === 404, 'Missing asset');
  check((await fetch('/fragment')).status === 403, 'No SPA fallback');
  let blocked = false;
  try { (0, eval)('1 + 1'); } catch { blocked = true; }
  check(blocked, 'Eval blocked');
  blocked = false;
  try { await fetch('https://external.invalid/example'); } catch { blocked = true; }
  check(blocked, 'Remote fetch blocked');
  const originalColor = getComputedStyle(result).color;
  result.setAttribute('style', 'color: rgb(255, 0, 0)');
  check(getComputedStyle(result).color === originalColor, 'Inline style blocked');
  result.removeAttribute('style');
  location.href = 'https://external.invalid/example-navigation';
  await pause(300);
  check(location.origin === 'https://neutronstar.invalid', 'Navigation blocked');
  document.title = 'NeutronStar smoke: PASS';
} catch {
  // Deliberately exclude names, replies and URLs from diagnostics.
  document.title = 'NeutronStar smoke: FAIL';
}
