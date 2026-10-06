# Static deployment and local preview

Vercel is the primary host. The proposed free project address is
`https://zodiac-modern.vercel.app`; no domain purchase is needed. The address is
unconfirmed and no deployment has been performed. Operator ownership, independent
verification channel and signing identity stay pending in
[release-trust.json](../config/release-trust.json).

## Local build and refresh

```sh
pnpm preview:local
# In another terminal after edits:
pnpm preview:refresh
# Reload http://127.0.0.1:4324 (clears the in-memory workspace).
```

Preview publishes complete immutable production snapshots with matching CSP.
A failed refresh preserves the previous served snapshot. The standalone build
is `pnpm build`, followed by `pnpm start:local`. `pnpm build:custom` deliberately
has no default recipient. Production requires the configured public key and
separately confirmed fingerprint. Neither command reads private keys.

## Vercel

Run `pnpm build:vercel` before deployment. It produces `.vercel/output/config.json`
and static files according to Build Output API v3. The header route continues
to filesystem routing, with HTML path overrides; there is no runtime adapter,
function, API or pre-evaluated root configuration. The output generator checks
the exact built hashes and refuses linked/junction output directories.

The release operator can publish this generated output with a separately
verified/pinned Vercel CLI using its prebuilt deployment command. Do not ask the
provider to rebuild a different artifact without regenerating and testing its
headers. Disable Web Analytics, Speed Insights, toolbar/code injection, third-party
widgets and monitoring scripts. Confirm the final deployed origin serves every
required security header on HTML routes/assets/errors, and exercise import,
encryption/recovery, copy/download/raster/print with no CSP errors or unexpected
requests. Those final-origin checks have not been run locally.

`pnpm check:m4` tests prebuilt serialization, byte-for-byte copies and removal of
synthetic stale files/functions. It is not a Vercel deployment or a provider
response test. See [Vercel Build Output configuration](https://vercel.com/docs/build-output-api/configuration).

## Other static hosts

Cloudflare Pages and Netlify can deploy the static `dist` tree with generated
`_headers`. Preserve that file and all restrictive directives. Pages imposes a
2,000-character limit on each full header line; the policy checker rejects
oversized lines rather than weakening CSP. These alternatives require their own
final-origin checks and no injected analytics/runtime functions. See
[Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)
and [Netlify custom headers](https://docs.netlify.com/manage/routing/headers/).

Surge remains conditional: support requires demonstrated control over the same
HTTP headers. CSP meta alone cannot provide HTTP-only framing/MIME/referrer/
permission protections. No alternative host is marked verified by this local
output test. File:// uses the stricter shared hash policy but has its documented
meta-CSP limits; see [EN-04 evidence](reviews/en04-prototype.md) and
[the CSP reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).
