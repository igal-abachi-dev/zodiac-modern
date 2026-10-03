# Local static serving

`scripts/serve-local.mjs` is a built-site development/offline helper. Vercel
production hosting receives only static files and generated headers; this helper
is not deployed as a server, API or provider function.

Keep Node's standard HTTP implementation for the current small scope: GET/HEAD,
loopback binding, local Host validation, confined real paths, no request logging,
MIME types and exact build-generated CSP/security headers. Automated tests check
these boundaries. It intentionally does not implement accounts, uploads, message
processing, compression or TLS. Trusted local files are the only resources served.

Fastify with `@fastify/static` is a viable future replacement if a concrete
maintenance need appears. Its static plugin supplies file-serving options, but
the application would still need its loopback/Host/confinement/header policy.
Adding a framework is not by itself a security review or a performance need.
The proposed `0.0.0.0`/request-logging example does not meet our local defaults.
[Fastify static documentation](https://github.com/fastify/fastify-static),
[Fastify server options](https://fastify.dev/docs/latest/Reference/Server/).

A VPS deployment through Nginx is a separate hosting choice and would need the
same final-origin header tests. It is unnecessary for the currently selected
Vercel static host. [Astro's Vercel guide](https://docs.astro.build/en/guides/deploy/vercel/).
