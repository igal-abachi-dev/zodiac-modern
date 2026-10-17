import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const workload = process.argv.includes('--workload'), diagnostic = process.argv.includes('--diagnostic');
const lane = workload ? (diagnostic ? 'dist-workload-diagnostic' : 'dist-workload') : (diagnostic ? 'dist-diagnostic' : 'dist');
const apps = new Set([
  'vanilla',
  'svelte',
  'react',
  'vue',
  'solid',
  'lit',
  'preact',
  'alpine',
  'htmx',
]);
const csp =
  "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.writeHead(403);
      res.end();
      return;
    }
    const path = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    );
    const parts = path.split('/').filter(Boolean);
    let dir, file;
    if (apps.has(parts[0])) {
      dir = resolve(root, `apps/${parts.shift()}/${lane}`);
      file = resolve(dir, parts.join('/') || 'index.html');
    } else {
      dir = resolve(root, 'packages/design/generated');
      file = resolve(dir, parts.join('/'));
    }
    if (!file.startsWith(dir + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    };
    const mime = types[extname(file)];
    if (!mime) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
server.listen(4178, '127.0.0.1', () =>
  console.log('Built synthetic assets only: http://127.0.0.1:4178/vanilla/'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close());
