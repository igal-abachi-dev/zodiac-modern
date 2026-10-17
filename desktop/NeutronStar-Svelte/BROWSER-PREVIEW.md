# Browser preview and desktop-host equivalence

The browser preview serves the **same built `dist/` frontend** consumed by
NeutronStar Host and the Tauri/Wails/pywebview/raw Rust candidates. Layout,
Svelte components, Nano Stores workflow, Ark/Zag behavior, CSS, fonts, icons,
and synthetic encryption/decryption actions come from those same asset files.
Changing the preview server does not rebuild or change them.

Chrome, Vivaldi, Brave and Edge can display the complete interface in a browser
tab. Browser extensions, versions, zoom and font rendering can still affect
appearance/timing. Native title bars, window APIs, lifecycle and process-tree
overhead belong to the desktop host, not to the standalone browser preview.
Tauri and the other frameworks may inject extra runtime scripts; identical input
files do not mean identical complete browser execution environments.

## Run

Use Node **24.21.x** and pnpm **12.8.1**. From this directory:

```powershell
# Once, or after preview tooling dependency changes; init.cmd also does this.
pnpm --dir scripts/preview install --ignore-workspace --frozen-lockfile --ignore-scripts

node scripts/serve.mjs
```

Open **http://127.0.0.1:4188/** in the desired browser. Stop with Ctrl+C.
For Explorer, right-click **Run-Browser.ps1** beside `Run.ps1` and select
**Run with PowerShell**. It runs the same server, resolves paths relative to
the project, checks the build/dependencies, and prefers the repository's pinned
Node before falling back to Node on PATH. Keep the PowerShell window open.
The equivalent root package command is `pnpm preview:csp`.
The script serves the existing `dist/`; run `pnpm build` only after changing
frontend source. Direct `file://` opening of `dist/index.html` is unsupported
because browser origin/CORS rules restrict its external ES modules.

## Which server to use

| Purpose | Command / choice |
| --- | --- |
| Edit frontend with hot reload | `pnpm dev` (Vite) |
| Quickly inspect Vite output | `pnpm preview` (Vite preview) |
| Check built assets under explicit CSP/file rules | `pnpm preview:csp` / `node scripts/serve.mjs` (Fastify) |
| Check native behavior or measure a desktop host | The selected host's `Run.ps1` and the external harness |

Vite describes `vite preview` as a local build preview, not a production server.
[Vite deployment guide](https://vite.dev/guide/static-deploy.html).
A general static tool such as `serve` can display these files too; it is not
needed alongside our tested policy-specific preview. The original small
`node:http` fixture was a valid local approach. Fastify supplies maintained
request routing, lifecycle/error handling and the static-file plugin, not an
automatic rendering or native-host performance advantage.

The current tool uses pinned **Fastify 5.12.7** and **@fastify/static 8.3.0**.
The plugin's official compatibility table supports its v8 line with Fastify v5.
[Plugin reference](https://github.com/fastify/fastify-static).
Dependencies and their own lockfile live under `scripts/preview/`, separate
from the frozen frontend dependency graph. They are not imported by Svelte,
bundled into `dist/`, or required by the built desktop hosts.

## How this relates to Nginx and gateways

```text
Chrome / Brave / Vivaldi / Edge
             |
     http://127.0.0.1:4188
             |
   Fastify + @fastify/static
             |
       existing dist/ files
```

This is a direct static-file server. It overlaps with Nginx's ability to serve
static assets and attach response headers. It does **not** forward requests to
an upstream service, so it is not a reverse proxy, API gateway or BFF. There is
no Go Chi/JWT/tenancy layer, gRPC or C# service here. Our Go receiver is not
involved and does not become an HTTP service.

Nginx's TLS termination, load balancing and proxy/rate-limit configuration address
different deployment needs. Using Fastify for a loopback-only preview is a
correct choice, not evidence of inferior HTML delivery. It also does not claim
equal throughput, public-edge protection or production operations readiness.
The project is not selecting an Internet deployment architecture in this step.

## Preserved preview policy

- Listens on `127.0.0.1` only; no request logging, public listener or API routes.
- Strict host-equivalent CSP on normal and rejected responses, `nosniff`,
  `no-store` and `no-referrer`. No CORS exception or relaxed browser launch flags.
- GET-only local assets, explicit MIME allowlist and 32 MiB/file limit.
  No automatic directory publishing, precompressed variants or SPA fallback.
- Missing permitted asset: 404. Unsupported methods/types and rejected path/Host
  checks: 403. Paths are checked for traversal/reparse escape; this local preview
  is not a substitute for the raw host's Windows handle-based policy review.

Browser compatibility tests use this server. Browser timings remain a separate
condition from native-host measurements. No comparative host benchmark has been
performed by adding the preview server.

## Nginx source review (2026-10-18)

Focused read-only review of the linked `master` sources, not a pinned Nginx
release audit or a throughput comparison. The useful lessons are HTTP/file
semantics and explicit configuration, rather than copying a C server into Node.

| Source observation | Decision for this preview |
| --- | --- |
| Static handler maps file errors, emits content length/type, Last-Modified/ETag and enables ranges | Verify bytes, length and exact MIME. Keep validators and ranges disabled for the current no-cache host-compatibility condition. |
| Static serving supports HEAD and directory redirects as part of the server's broader behavior | Retain explicit GET-only policy and no directory/SPA fallback. This is intentionally not general HTTP-server behavior parity. |
| URI parser handles percent escapes, dot segments and Windows separator differences | Test encoded traversal, double encoding, NUL and malformed escapes; let maintained HTTP/router libraries parse requests. |
| Header filter skips some response statuses unless a header has the `always` flag | Verify security headers on rejected/error responses, including router-generated errors. |

References: [Nginx static handler](https://github.com/nginx/nginx/blob/master/src/http/modules/ngx_http_static_module.c),
[URI parser](https://github.com/nginx/nginx/blob/master/src/http/ngx_http_parse.c),
[headers filter](https://github.com/nginx/nginx/blob/master/src/http/modules/ngx_http_headers_filter_module.c).

This review found two concrete preview issues and led to fixes:

1. A malformed URL such as `/bad%ZZ.js` produced Fastify's early 400 without our
   CSP/cache/referrer/nosniff headers. It bypasses normal hooks. An explicit public
   router `onBadUrl` handler now returns an empty 400 with the same headers;
   normal Fastify responses receive them in `onSend`.
2. The static plugin overwrote the requested JavaScript MIME with its own
   `application/javascript` inference. That MIME rendered correctly, but it did
   not match our documented `text/javascript` policy. Successful file responses
   now retain the explicit MIME at the final response hook. Tests check the
   actual response type, content length and bytes for every frozen asset.

Expanded regression coverage also checks no ETag/Last-Modified, no compression
variant or range response, and security headers on all tested rejection paths.
This does not promise headers for raw TCP/HTTP-parser failures before Fastify's
router, nor establish Internet-facing deployment readiness.

One relevant limitation remains: our path checks precede the static plugin's
file open; they are not an atomic open-and-validate confinement guarantee against
a local actor replacing files concurrently. Nginx's inspected handler uses an
opened file descriptor and its metadata through output. Our preview assumes the
locally built asset tree is stable during use; sensitive delivery still requires
the separate native host's policy/review. No native host or Svelte asset changes
were made by this source review.
