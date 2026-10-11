# Static deployment and local preview

Vercel is the primary host. The proposed free project address is
`https://zodiac-modern.vercel.app`; no domain purchase is needed. The address is
unconfirmed and no deployment has been performed. The project owner is
`igal-abachi-dev`. Verification-channel publication and actual certificate
provisioning stay pending in
[release-trust.json](../config/release-trust.json).

## Release decisions recorded 2026-10-11

- **Hosted address:** use the free Vercel project URL, with
  `https://zodiac-modern.vercel.app` as the desired address. A repository name
  does not reserve that URL; verify the project actually owns it before calling
  it the official origin. No custom-domain purchase is planned.
- **Signing:** self-signed code signing is selected for now. Unsigned candidates
  and a future publicly trusted CA certificate (for example DigiCert or another
  suitable CA) remain alternatives. No signing certificate has been created by
  recording this decision. Its intended subject is **`CN=Zodiac Modern`**, chosen
  without a development suffix. Confirm the actual subject and record the
  public-certificate SHA-256 pin after provisioning. This is a self-declared label,
  not CA-verified identity or a reviewed-release claim.
- **Verification channel:** [official GitHub Releases](https://github.com/igal-abachi-dev/zodiac-modern/releases)
  for [the public repository](https://github.com/igal-abachi-dev/zodiac-modern).
  Publish full **SHA-256** checksums for each final HTML/EXE/ZIP and the manifest.
  Sign native files first, hash the final signed bytes, then archive and hash the
  final ZIP. Exclude the manifest's own hash from its internal file list; publish
  that hash separately. SHA-256 is the project's standard checksum, not an
  identity signature. Do not use MD5/SHA-1 or abbreviated hashes for verification.
- **Private reporting:** enable GitHub private vulnerability reporting and have
  the project owner, **igal-abachi-dev**, monitor it. Activation remains unverified.
  Support **only the latest stable release**; candidates/prereleases are not
  stable supported versions. Do not post
  confidential reports in public issues or promise an unstaffed response SLA.
- **Operational ownership:** the project owner handles Vercel, signing-key
  custody, releases and vulnerability/incident triage. An independent reviewer
  will be selected later; that review gate remains open.

A self-signed certificate can establish continuity only when its public identity
or pin was obtained through a trusted channel and the signature is correctly
verified. It is not automatically trusted by Windows, CA-verified publisher
identity or assurance against SmartScreen warnings. Keep its signing key separate
from recipient RSA keys and outside the repository, hosted assets and releases;
use dedicated code-signing usage, SHA-256, protected/non-exportable storage where
feasible and explicit expiry/rotation records. Any pinned self-signed verification
workflow needs its own implementation/tests and review. The current
`verify-receiver.ps1` requires Windows `Valid` Authenticode status and an exact
publisher subject; it is not weakened for this decision. Do not install an
unverified certificate as a trusted root or advise bypassing Windows warnings.
See [Microsoft self-signed certificate tooling](https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate)
and [signature verification](https://learn.microsoft.com/en-us/windows/win32/seccrypto/using-signtool-to-verify-a-file-signature).

GitHub Releases is separate from the Vercel download origin, but compromise of
the GitHub account or common build credentials can affect both. A previously
verified bookmark/account identity and, where available, independently published
reviewer hashes strengthen this check. Recording the channel does not mean its
contents or a release have already been independently reviewed. See
[GitHub private reporting setup](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

### Local unsigned candidate packaging

```powershell
pnpm release:package --candidate
```

This prepares an explicitly unsigned, unreviewed development bundle under
`artifacts/releases/`, containing versioned standalone HTML, the Windows Go
receiver, hosted/static Vercel outputs, licenses, public recipient configuration,
verification helpers, a per-file manifest and separate final SHA-256 checksums.
It verifies staged file hashes and reads every ZIP entry back without executing
or extracting it. Two sequential same-input HTML/receiver builds are compared;
this is not clean-room reproducibility evidence. It never signs, deploys, publishes
or declares release readiness. Candidate packaging remains unsigned until the
selected self-signing workflow is provisioned and separately validated.

The owner-run [signing provisioning helper](../scripts/New-ZodiacSigningCertificate.ps1)
has a non-mutating `-WhatIf` mode. It requests protected, non-exportable signing
material in the current-user personal certificate store and exports only a public
certificate and receipt. Actual provisioning requires native owner interaction;
it is not performed by candidate packaging. No trust roots are installed. See
[E09 signing preparation and remaining verification design](reviews/e09-signing-preparation.md).

## One public repository, two build outputs

The operator selected one public GitHub repository for source and release
artifacts. Keep the hosted Astro site and the self-contained offline sender
derived from the same source here; a separate HTML-only repository is not
required. Private keys, passphrases, signing credentials and private vulnerability
reports stay outside public Git/source/release assets. Publishing source does
not by itself authenticate delivered builds or complete security review.

The existing commands are:

```powershell
pnpm build:vercel
# Hosted static site: .vercel/output, including exact generated security headers.

pnpm spike:offline-html
# Synthetic development fixture; never treat its default key as a real recipient.
pnpm spike:offline-html custom
# Self-contained development candidate requiring the sender to choose a public key.
pnpm spike:offline-html production
# Development candidate with an explicitly configured, confirmed public recipient.
```

These commands use `scripts/build.mjs` and `scripts/build-offline.mjs`; no new
PowerShell build wrapper is needed. The offline prototype is written under
`artifacts/offline probe שלום/zodiac-synthetic-probe.html`, even for custom or
production modes. It is **not** the ordinary Astro `dist/index.html`, which
references adjacent assets. The prototype naming and packaging still need the
reviewed version/commit release process before distribution as a final release.

Keep generated `dist`, `.vercel` and `artifacts` directories out of Git, as the
current ignore rules do. Deploy the reviewed static output to Vercel and attach
the reviewed versioned offline HTML, signed Go receiver and final manifests to
GitHub Releases. No visibility change, release upload or deployment is performed
by these local build commands. See
[GitHub release assets](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

The HTML already uses ordinary esbuild JavaScript minification (`minify: true`).
Keep that size optimization; do not add deliberate obfuscation or dynamic-code
loaders. Minification is not secrecy or an integrity control. Retain readable
source, pinned dependencies, provenance and the exact final artifact hashes.

Before opening an offline artifact, run `scripts/verify-sender.ps1` with its path
and a SHA-256 value obtained through an independently trusted channel. Check
`Get-Help ./scripts/verify-sender.ps1 -Full` and the
[verification guide](../README.md#deployment-and-offline-use) for its arguments.
The helper checks supplied bytes/hash and does not establish who supplied the
expected hash. Hosted same-site hashes cannot independently authenticate a
compromised site. Offline browser checks, human usability, independent review
and final sender delivery selection remain release gates; the current HTML is
a tested development candidate, not a finalized release packager.

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
