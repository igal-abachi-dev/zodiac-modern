import { fixture } from './module.mjs';

const check = (value, label) => { if (!value) throw new Error(label); };
try {
  check(fixture === 'local module loaded', 'ES module loading');
  check(document.querySelector('#sample').value.includes('שלום'), 'Unicode DOM');
  const sentinel = document.querySelector('#sentinel');
  check(getComputedStyle(sentinel).color === 'rgb(12, 34, 56)', 'local stylesheet');
  sentinel.setAttribute('style', 'color: rgb(255, 0, 0)');
  check(getComputedStyle(sentinel).color === 'rgb(12, 34, 56)', 'style-src-attr enforcement');
  let denied = false;
  try { (0, eval)('1 + 1'); } catch { denied = true; }
  check(denied, 'eval denied');
  denied = false;
  try { await fetch('https://external.invalid/probe'); } catch { denied = true; }
  check(denied, 'remote connect denied');
  const fragment = await fetch('/fragment.html').then(r => r.text());
  check(fragment.includes('Local HTML fragment'), 'same-origin static fragment');
  const missing = await fetch('/missing.txt');
  check(missing.status === 404, 'bounded missing resource');
  const post = await fetch('/fragment.html', { method: 'POST', body: 'public fixture' });
  check(post.status === 403, 'non-GET denied');
  const privateFile = await fetch('/private.pem');
  check(privateFile.status === 403, 'unlisted asset type denied');
  window.open('https://external.invalid/popup', '_blank');
  location.href = 'https://external.invalid/navigation';
  await new Promise(resolve => setTimeout(resolve, 300));
  document.querySelector('#result').textContent = 'PASS';
  document.title = 'NeutronStar smoke: PASS';
} catch (error) {
  document.querySelector('#result').textContent = String(error);
  document.title = 'NeutronStar smoke: FAIL';
}
