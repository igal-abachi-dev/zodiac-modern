// Operator-run public artifact check. Never a hosted poller or secret API.
import { readFile } from 'node:fs/promises';
import { relative, resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { filesAt } from './walk-files.mjs';
import { checkPolicy } from './check-policy.mjs';
import { sha256 } from './release-manifest.mjs';

export function deploymentOrigin(value, localTest = false) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw Error('Supply a bare deployment origin, without credentials/path/query/fragment.');
  const local = localTest && url.protocol === 'http:' && url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !local) throw Error('HTTPS deployment origin required.');
  if (localTest && !local) throw Error('Local-test mode requires http://127.0.0.1.');
  return url;
}

export function deliveredHeaders(actual, expected, https) {
  for (const [name, value] of Object.entries(expected))
    if (actual.get(name)?.trim() !== value)
      throw Error(`Delivered security header differs: ${name}`);
  if (https) {
    const hsts = actual.get('Strict-Transport-Security') ?? '';
    const age = /(?:^|;)\s*max-age=(\d+)(?:\s*;|\s*$)/i.exec(hsts);
    if (!age || Number(age[1]) < 31536000)
      throw Error('Delivered HTTPS origin needs HSTS max-age of at least one year.');
  }
}

export async function boundedResponse(response, maximum) {
  if (!response.body) throw Error('Missing deployed response body.');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maximum) {
        await reader.cancel();
        throw Error('Deployed response exceeds the expected artifact size.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, length);
}

export async function auditDeployment(root, origin, { localTest = false, fetcher = fetch } = {}) {
  const base = deploymentOrigin(origin, localTest);
  const expected = await checkPolicy(root);
  const files = [];
  for (const file of await filesAt(root)) {
    const name = relative(resolve(root), resolve(file)).replaceAll('\\', '/');
    if (name === '_headers' || name.startsWith('.')) continue;
    const path = name === 'index.html' ? '/' : name.endsWith('/index.html')
      ? '/' + name.slice(0, -10) : '/' + name;
    const url = new URL(path.split('/').map(encodeURIComponent).join('/'), base);
    const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (response.status !== 200 || response.redirected) throw Error(`Unexpected status/redirect: ${path}`);
    deliveredHeaders(response.headers, expected, !localTest);
    const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (name.endsWith('.html') && type !== 'text/html') throw Error(`Incorrect HTML MIME type: ${path}`);
    if (name.endsWith('.js') && !['text/javascript', 'application/javascript'].includes(type)) throw Error(`Incorrect script MIME type: ${path}`);
    if (name.endsWith('.css') && type !== 'text/css') throw Error(`Incorrect CSS MIME type: ${path}`);
    const bytes = await readFile(file);
    const actual = await boundedResponse(response, bytes.length);
    if (!actual.equals(bytes)) throw Error(`Deployed bytes differ from local artifact: ${path}`);
    files.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const missing = new URL(`/zodiac-release-check-not-found-${randomUUID()}/`, base);
  const response = await fetcher(missing, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (response.status !== 404) throw Error('Missing route must return 404 without redirects.');
  try { deliveredHeaders(response.headers, expected, !localTest); }
  finally { await response.body?.cancel(); }
  return {
    recorded: new Date().toISOString(), origin: base.origin, files,
    missingRoute: '404 with expected security headers',
    scope: localTest ? 'Loopback static-output check; not deployment evidence.' : 'Public GET-only byte/header/MIME check. Not browser flow, domain ownership, rollback, independent review or release approval.',
    passed: true,
  };
}
