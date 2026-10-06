# E07 hardening and review boundaries

The sender and recovery flows operate under production CSP, including after HTTP
networking is disabled. Encryption and the compatible envelope, glyph maps and
transcription grammar are unchanged. `pnpm check:m4` runs the author acceptance
gate and writes [the current machine record](reviews/e07-evidence.json).
This is development evidence, not an independent system audit or release approval.

## Implemented controls

- One policy supplies exact built script/style hashes to HTTP and bundled HTML.
  Script/style attributes, connections, workers, objects, forms and base URLs
  remain blocked. HTTP also forbids framing. Startup refuses stale hashes or
  divergent provider headers; generated SVG/print is checked without style attributes.
- Real Chromium/Firefox flows warm both sender and recovery, block HTTP and go
  offline, then import public keys, encrypt, save raw/SVG/PNG/JSON, prepare/clear
  print and reassemble checked printed rows. No runtime requests, app storage,
  cookies, cache entries, worker registration or input in logs/URLs/title/history
  is observed. Clipboard denial has a manual fallback. History/reload reset
  checks include an explicit persisted-pageshow branch; no claim that automation
  forces the browsers into real BFCache.
- The artifact audit refuses private material, fixture fingerprints/public PEM
  bodies, test/browser-decrypt code, API/functions, source maps, environment
  secrets, speculative remote resources and network/persistence APIs. These
  source/text checks complement enforced browser tests; they are not a general
  malicious-JavaScript proof.
- Exact dependency pins, actual bundled runtime license notices, authenticated
  Go module-cache verification, complete fresh vendor-tree comparison and
  offline vendor tests/builds remain gates. Frozen Lucide paths retain separate
  provenance. No production private key is a validation input.
- Vercel output is generated after the build from checked bytes and hashes.
  Regeneration discards old files/functions; internal build metadata stays out
  of hosted files. Nothing is deployed by the acceptance command.
- Public security/privacy/how-it-works pages describe recipient custody,
  length disclosure, local exports, memory limitations, delivered-code trust
  and missing sender authentication/forward secrecy/post-quantum protection.
  The flow diagram is native markup and reflects browser encryption/offline Go.

## Trust anchors and substitutions

[release-trust.json](../config/release-trust.json) records the user's proposed
`https://zodiac-modern.vercel.app` address. Availability/control and final response
headers have not been verified. A custom domain is unnecessary. Official origin,
Authenticode publisher, independent verification channel, incident/domain/signing
owners and reviewed release are pending. The operator-confirmed public recipient
is configured separately; that does not establish release publisher trust.

Verify a future sender HTML externally **before opening or typing**, against a
full hash obtained independently. [verify-sender.ps1](../scripts/verify-sender.ps1)
checks bytes without opening them. For a future Windows receiver,
[verify-receiver.ps1](../scripts/verify-receiver.ps1) requires a matching full
SHA-256, valid Authenticode signature and exact expected certificate subject;
it never starts the executable. Wrong hashes, altered HTML, unsigned files and
wrong expected publishers are refusal tests. There is no signed Zodiac release
to use as a positive publisher-verification case yet. Windows signature validation
may perform OS certificate/revocation checks; that is outside browser app traffic.

A clone can copy page content and same-site hashes. TLS, a copied fingerprint or
a badge cannot establish honest executable code. CSP reduces allowed behavior
but a compromised host can replace both code and policy. Before sensitive input
on an untrusted host, use a reviewed local sender whose exact bytes were verified
through the independent trusted channel. Unsigned development artifacts are
clearly identified throughout the guidance.

## Remaining M4/release gates

SEC-04 operational trust anchors remain undecided. SEC-02's browser/network and
source checks pass; an OS-enforced network-denial receiver trial is still open.
REC-01's earlier focused conditional approval and author-verified fixes remain
separate from QA-03's integrated independent assessment.

WebKit, published CI (the workflow remains a template by user choice), real
assistive technology, five novice-recipient trials, device latency/long tasks,
Gmail-primary/Outlook-secondary unsent draft paste and EN-04's full stable-browser/
headed verification review remain open. File:// recovery and exports are tested,
but a release delivery selection is not inferred from that prototype.
Final-origin provider checks, signed receiver and independently published final
hashes are release requirements. See [the review packet](reviews/m4-review-packet.md)
and [deployment instructions](deployment.md).
