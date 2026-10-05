# M1 development acceptance and receiver integration

This packet is author-run synthetic evidence. It is not a release, formal
cryptographic proof, independent integrated audit or new reviewer verdict.
M1 covers compatible crypto, strict public parsing/fingerprints and default/
custom recipient paths. Production recipient identity remains a launch gate.

Implemented acceptance: CRY-01/02/03, KEY-02 and UX-01/02. UX-03's raw result,
copy/download, immutable recipient/profile/checksum, repeat-message, clear and
navigation lifecycle and frozen glyph display are working. Its optional artwork
action group remains dependent on M3 SVG/PNG/print and must not be marked entirely Done.
REC-02 implements the Windows native authenticated command and private output;
KEY-03 guidance and native synthetic backup drills now pass. REC-03's readiness
helper passes original/restored verification and exact nonsecret token decryption
for both sizes. The operator's own backup drill, observed first-time user trial,
release steps and QA-03 remain separate work.

Reproduce with the pinned installed toolchains and already authenticated caches:

```powershell
$env:ZODIAC_OPENSSL30 = 'path\to\recorded-openssl-3.0.exe'
$env:ZODIAC_OPENSSL35 = 'path\to\recorded-openssl-3.5.exe'
pnpm check:rec01
node scripts/snapshot-rec01.mjs
pnpm check:m1
```

Use a normal native Windows context for file/ACL tests; a restricted sandbox
token can correctly be denied by owner-only output ACLs. The workflow is a
template in `workflows/`, not active GitHub Actions.

[M1 machine evidence](m1-evidence.json) records source hashes, exact versions,
format/types, unit/browser counts, separate fixture/custom builds and artifact
checks, rebuilt fully inline actual Svelte sender prototype, and the configured
production build/public-only browser fingerprint/export check. Missing production
configuration and fixture substitutions remain covered by isolated refusal tests.
[Receiver evidence](rec01-evidence.json) records native tests, six real
OpenSSL oracle profiles, schema/resource/mutation tests, two 30-second fuzz
targets and full regenerated-vendor/pin/offline verification.

Browser cases include byte-exact independent Go oracle and actual command
implementation, both RSA sizes, same-size wrong keys and each field mutation,
all-byte/boundary/canonical codecs, original lone-surrogate rejection, fresh
key/nonce, nonextractable AES and owned-buffer clearing on success/failure,
duplicate/reset/digest races, key snapshots, failed-retry drafts, IME/newline,
capability refusal, raw exact download/manual-copy fallback, reload/back and
network/storage/URL/CSP/DOM checks. Failure/latency adapters wrap native crypto
only in separate synthetic test cases; interop uses unmodified native crypto.

Visual evidence covers light/dark measured AA text/button/link/muted contrast,
control-border contrast, native labeled focus/touch targets, 320px reflow,
synthetic 200% text zoom, reduced motion and print. It does not claim a full
assistive-technology audit or completed artwork/print export QA.

[Actual receiver console receipts](rec02-console-evidence.json) separately
record real executable runs on browser ciphertext, genuine hidden local prompt,
nonsecret success receipts and exact output comparisons. The fixture password
is explicitly synthetic. This does not prove interactive OpenSSL non-ASCII
setup compatibility. See [output implementation](../decisions/rec02-local-output.md)
for the native path/ACL/race/error boundary and evidence limits.

Next review scope: key creation/custody/readiness, implemented symbols/recovery and future exports,
complete offline sender verification UX, native output and terminal integration,
privacy/host trust, release packaging/publisher hashes/signatures and QA-03.

The current production recipient is the operator-confirmed RSA-4096 public key,
labelled Zodiac Modern recipient. The full DER SPKI fingerprint was confirmed
through the operator's separate local OpenSSL/receiver console, not a website
badge. [Public-only browser evidence](production-recipient-evidence.json) checks
the actual default and exported canonical public PEM. Private files remain in
the explicitly authorized ignored local folder and are not read by these checks.

[Key setup evidence](key-setup-evidence.json) covers actual hidden OpenSSL and Go
prompts, both RSA sizes and byte-exact restored encrypted-backup drills. The
missing public directory error in the first operator setup was repaired without
regenerating the key; the public-copy helper has a fresh-directory/overwrite
regression. Windows PowerShell 5.1 native random-byte rejection and redirected
output refusal are tested; modern GetInt32 availability is handled explicitly.
Unix permissions, ARM64 and interactive non-ASCII OpenSSL compatibility remain
unclaimed. EN-04's full artwork/platform/review gate remains open.

[E05 evidence](e05-evidence.json) records 64 frozen glyph vectors/provenance,
bounded pagination and legend, exact raw/transcribed-row recovery, independent
S64CHECK1 vectors and whole-envelope checks, maximum-size behavior, synthetic
24/16 px and print legend captures, and the expanded stable Edge file:// case.
EXP-04 helpers and local form are implemented; generated print labels/metadata
integration remains E06. [Readiness helper evidence](rec03-helper-evidence.json)
and the [human trial record](rec03-readiness-trial.md) keep technical checks and
pending participant outcomes distinct.

The [S64M1 follow-up](mixed-view-evidence.json) supersedes the original screen
baseline: 29 unit tests, 42 Chromium/Firefox cases and the expanded stable Edge
file:// case pass. The screen mixes literal payload characters with glyphs,
reserves CircleOff/Crosshair/Skull as nulls and uses a pinned view-only
CircleDashed override for `j`. Global placement/orientation, raw exports,
unchanged recovery, max-size pagination, CSP and mobile/print visual checks pass.
All glyphs remain outlined by explicit user choice.

The [sender layout/paging follow-up](sender-layout-evidence.json) records the
earlier source/build validation: 29 unit tests, 44 Chromium/Firefox cases and
the stable Edge file:// case. Encryption selects the glyph display, custom
public-key controls start collapsed, Encrypt/Clear precede readiness, and
paging scrolls to the first row. Initial desktop/mobile visibility, keyboard
accordion, production CSP and pnpm 4324 start/refresh checks pass.

The [simultaneous results follow-up](simultaneous-results-evidence.json) replaces
the exclusive view controls: complete canonical raw ciphertext appears above
the glyph grid automatically after every successful encryption. Both remain
visible together, including during manual clipboard fallback. The refreshed M1
gate and stable Edge file:// case cover the shared hosted/offline component;
configured-public preview captures check desktop/mobile order and production CSP.
