import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
const root = await realpath(
  resolve(process.argv.includes('--fixture') ? 'artifacts/test-site' : 'dist'),
);
const headers = JSON.parse(
  await readFile(resolve(root, '.security-headers.json'), 'utf8'),
);
const port = Number(process.env.ZODIAC_PORT ?? 4321);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid local port.');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pem': 'application/x-pem-file',
  '.txt': 'text/plain; charset=utf-8',
};
const confined = (path) => {
  const rel = relative(root, path);
  return (
    rel === '' ||
    (!rel.startsWith(`..${sep}`) && rel !== '..' && !rel.includes(':'))
  );
};
const server = createServer(async (req, res) => {
  for (const [name, value] of Object.entries(headers))
    res.setHeader(name, value);
  try {
    if (
      !['GET', 'HEAD'].includes(req.method) ||
      ![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)
    ) {
      res.writeHead(403).end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url, 'http://127.0.0.1').pathname,
    );
    if (
      pathname.includes('\\') ||
      pathname.includes('\0') ||
      pathname
        .split('/')
        .some((part) => part.startsWith('.') || part === '_headers')
    ) {
      res.writeHead(404).end();
      return;
    }
    let path = resolve(root, `.${pathname}`);
    if (!confined(path)) {
      res.writeHead(404).end();
      return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    path = await realpath(path);
    if (!confined(path)) {
      res.writeHead(404).end();
      return;
    }
    const bytes = await readFile(path);
    res.setHeader(
      'Content-Type',
      mime[extname(path)] ?? 'application/octet-stream',
    );
    res.setHeader('Content-Length', bytes.length);
    res.writeHead(200).end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(404).end();
  }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(port, '127.0.0.1', () =>
  console.log(`Static sender: http://127.0.0.1:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close());
