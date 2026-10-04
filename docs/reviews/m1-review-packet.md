# M1 development acceptance and receiver integration

This packet is author-run synthetic evidence. It is not a release, formal
cryptographic proof, independent integrated audit or new reviewer verdict.
M1 covers compatible crypto, strict public parsing/fingerprints and default/
custom recipient paths. Production recipient identity remains a launch gate.

Implemented acceptance: CRY-01/02/03, KEY-02 and UX-01/02. UX-03's raw result,
copy/download, immutable recipient/profile/checksum, repeat-message, clear and
navigation lifecycle are working. Its full display/artwork action group remains
dependent on M3 symbols/SVG/PNG/print and must not be marked entirely Done.
REC-02 implements the Windows native authenticated command and private output;
KEY-03 guidance and native synthetic backup drills now pass. REC-03's independent
nontechnical usability/release steps and QA-03 remain separate work.

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

Next review scope: key creation/custody/readiness, symbols/recovery/export,
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
unclaimed. EN-04's full artwork/recovery/platform/review gate remains open.
