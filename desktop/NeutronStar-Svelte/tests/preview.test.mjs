import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPreviewServer, csp } from '../scripts/preview/server.mjs';

test('built preview serves frozen assets with CSP and rejects non-asset requests', async () => {
  const server = await createPreviewServer();
  try {
    const manifest = JSON.parse(await readFile(new URL('../.cache/frontend-manifest.json', import.meta.url)));
    assert.equal(manifest.fixture, 'starlight-en-he-v2');
    assert.deepEqual(manifest.files.filter(file => file.path.startsWith('fonts/')).map(file => file.path).sort(), [
      'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-500-normal.woff2',
      'fonts/inter-latin-600-normal.woff2', 'fonts/noto-sans-hebrew-hebrew-400-normal.woff2',
    ]);
    for (const file of manifest.files) {
      const response = await server.inject({ method: 'GET', url: '/' + file.path });
      assert.equal(response.statusCode, 200, file.path);
      assert.deepEqual(response.rawPayload, await readFile(new URL('../dist/' + file.path, import.meta.url)));
      assert.equal(response.headers['content-security-policy'], csp);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.headers['x-content-type-options'], 'nosniff');
      assert.equal(response.headers['referrer-policy'], 'no-referrer');
      assert.equal(Number(response.headers['content-length']), response.rawPayload.length);
      assert.equal(response.headers.etag, undefined);
      assert.equal(response.headers['last-modified'], undefined);
      const mime = file.path.endsWith('.html') ? 'text/html'
        : file.path.endsWith('.js') ? 'text/javascript'
        : file.path.endsWith('.css') ? 'text/css'
        : file.path.endsWith('.svg') ? 'image/svg+xml'
        : 'font/woff2'; // The frozen fixture's remaining assets are WOFF2 fonts.
      assert.ok(response.headers['content-type'].startsWith(mime), file.path);
    }
    const cases = [
      { url: '/', status: 200 },
      { url: '/index.html?preview=1', status: 200 },
      { url: '/missing.js', status: 404 },
      { url: '/not-a-route.html', status: 404 },
      { url: '/not-allowed.exe', status: 403 },
      { url: '/assets/', status: 403 },
      { url: '/%2e%2e%2fpackage.json', status: 403 },
      { url: '/assets%5cfile.js', status: 403 },
      { url: '/.hidden.js', status: 403 },
      { url: '/bad%ZZ.js', status: 400 },
      { url: '/%00.js', status: 403 },
      { url: '/%252e%252e%252fpackage.json', status: 403 },
      { url: '/assets/%2e%2e%2findex.html', status: 403 },
      { url: '/index.html', method: 'POST', status: 403 },
      { url: '/index.html', method: 'HEAD', status: 403 },
      { url: '/index.html', headers: { host: 'example.invalid' }, status: 403 },
    ];
    for (const { status, ...request } of cases) {
      const response = await server.inject(request);
      assert.equal(response.statusCode, status, JSON.stringify(request));
      assert.equal(response.headers['content-security-policy'], csp);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.headers['x-content-type-options'], 'nosniff');
      assert.equal(response.headers['referrer-policy'], 'no-referrer');
    }
    const range = await server.inject({ url: '/index.html', headers: {
      range: 'bytes=0-9', 'accept-encoding': 'gzip, br',
    } });
    assert.equal(range.statusCode, 200);
    assert.deepEqual(range.rawPayload, await readFile(new URL('../dist/index.html', import.meta.url)));
    assert.equal(range.headers['content-range'], undefined);
    assert.equal(range.headers['accept-ranges'], undefined);
    assert.equal(range.headers['content-encoding'], undefined);
  } finally { await server.close(); }
});
