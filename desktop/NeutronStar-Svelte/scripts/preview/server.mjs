import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { lstat, realpath } from 'node:fs/promises';
import { resolve, relative, sep, extname, isAbsolute } from 'node:path';

export const csp = "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const securityHeaders = {
  'Content-Security-Policy': csp, 'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
};
const types = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
}));

export async function createPreviewServer() {
  const configuredRoot = resolve(import.meta.dirname, '../../dist');
  if ((await lstat(configuredRoot)).isSymbolicLink()) throw new Error('Reparse dist root');
  const root = await realpath(configuredRoot);
  const app = Fastify({ logger: false, exposeHeadRoutes: false, bodyLimit: 1024,
    routerOptions: {
      // Router parse failures bypass the normal request/reply hook lifecycle.
      onBadUrl: (_path, _request, response) => {
        response.writeHead(400, { ...securityHeaders, 'Content-Length': '0' });
        response.end();
      },
    },
  });
  app.decorateReply('assetMime', null);
  // Apply to final framework responses too: malformed-URL errors can skip
  // onRequest, just as error responses need explicit header policy in Nginx.
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.headers(securityHeaders);
    // The plugin supplies its own inferred MIME. Keep our explicit host policy.
    if (reply.statusCode === 200 && reply.assetMime) reply.type(reply.assetMime);
    return payload;
  });
  app.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'GET' || !/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(request.headers.host ?? ''))
      return reply.code(403).send();
  });
  // Use the plugin's sendFile implementation without automatically publishing
  // directories, aliases, compressed variants or SPA fallback routes.
  await app.register(fastifyStatic, {
    root, serve: false, index: false, redirect: false, dotfiles: 'deny',
    preCompressed: false, cacheControl: false, etag: false,
    lastModified: false, acceptRanges: false,
  });
  const serveAsset = async (request, reply) => {
    let pathname;
    try { pathname = decodeURIComponent(request.raw.url.split('?')[0]); }
    catch { return reply.code(403).send(); }
    const name = pathname === '/' ? 'index.html' : pathname.slice(1);
    const parts = name.split('/');
    const mime = types.get(extname(name));
    if (!pathname.startsWith('/') || !mime || parts.some(part =>
      !part || part.startsWith('.') || /[\\:%<>"|?*\x00-\x1f\x7f]/.test(part) || /[. ]$/.test(part)))
      return reply.code(403).send();
    const file = resolve(root, ...parts);
    if (!file.startsWith(root + sep)) return reply.code(403).send();
    try {
      let component = root;
      for (const part of parts) {
        component = resolve(component, part);
        if ((await lstat(component)).isSymbolicLink()) return reply.code(403).send();
      }
      const final = await realpath(file);
      const confined = relative(root, final);
      if (isAbsolute(confined) || confined.startsWith('..' + sep) || confined === '..')
        return reply.code(403).send();
      const info = await lstat(file);
      if (!info.isFile()) return reply.code(404).send();
      if (info.size > 32 * 1024 * 1024) return reply.code(403).send();
    } catch (error) {
      return reply.code(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 403).send();
    }
    reply.assetMime = mime;
    return reply.sendFile(name);
  };
  app.get('/', serveAsset);
  app.get('/*', serveAsset);
  app.setNotFoundHandler((_request, reply) => reply.code(404).send());
  app.setErrorHandler((error, _request, reply) => {
    const code = error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    reply.code(code).send(); // No filesystem paths or request values in errors.
  });
  return app;
}
