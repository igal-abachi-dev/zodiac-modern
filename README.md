# Zodiac Modern

Local-first message encryption with a browser sender, celestial glyph artwork, and an offline Go recipient tool.

Choose a recipient public key, encrypt a message locally, and share the ciphertext. Keep private keys and decryption on the recipient's device.

## Using Zodiac Modern

**Availability:** this is a development project. There is no reviewed website
origin or signed receiver download yet. Use synthetic messages and test keys
until an independently verified release is announced. The proposed
`zodiac-modern.vercel.app` address is not verified or claimed here.

### Encrypt and share

1. Open the verified sender site. Type the message and choose **Encrypt
   message**. Encryption runs in the browser; the site accepts public keys only.
2. To address a different recipient, ask them for their `rsa-public.pem` and
   the complete SHA-256 fingerprint through a trusted channel. Choose **Use a
   custom public key**, paste the PEM or select its file, and compare the full
   fingerprint in **Recipient details** with the value you verified. The key
   stays in this tab's memory and is cleared on reload.
3. After encryption, the raw Base64URL ciphertext and glyph artwork appear
   together. **Copy raw** or **Download ciphertext (.txt)** for delivery; the
   receiver needs the exact raw text. The glyph grid and exported PNG/SVG are
   visual presentation and cannot be decrypted by the v1 receiver.
4. For archival use, open **Archival pages and print** to save pages or print / save
   as PDF. Full print includes every page; selected-page output is partial.
   Printed row recovery and page checks help detect transcription mistakes.
   See [sharing, exports and print](docs/exports.md) for clipboard limits,
   supported browser evidence and recovery instructions.

**Recommended delivery options (no Tor/qBittorrent install for the recipient):**

1. **Proton Drive link — default when you want expiry/revocation controls.** Use viewer-only access, a short expiry, and optionally a strong link password sent separately. The recipient can download in a browser. Proton Drive sharing is tied to the sharer's account and exposes link activity metadata; revocation cannot erase a file already downloaded.
2. **Proton Mail attachment — convenient if both parties already use Proton Mail.** The attachment is Zodiac ciphertext, so the recipient's private key is still required to read it.
3. **Gmail attachment — convenient fallback.** It carries the Zodiac-encrypted ciphertext, while ordinary email metadata (sender, recipient, time, subject and file size) remains visible to the mail service.
4. **Wormhole link — convenient expiring browser transfer.** Treat the entire link as a secret because it contains the Wormhole file-transfer key. Anyone who gets the link can retrieve the transferred file, but Zodiac ciphertext still requires the recipient's private key to decrypt.

For the simplest route, send the raw ciphertext as a Proton Mail or Gmail attachment. For a browser-download link with expiry, Proton Drive is the default recommendation. Use a neutral filename and subject; send any separate link password through a different end-to-end encrypted channel. A VPN is optional and does not add confidentiality to the Zodiac ciphertext or hide your account from a service where you are signed in.

### Receive and decrypt

The recipient creates and verifies an encrypted RSA key pair using the
[offline key setup guide](src/pages/keys.astro). They keep
`rsa-private-encrypted.pem` and its passphrase private, then shares only the contents of
`rsa-public.pem` (SPKI PEM) and its full SHA-256 fingerprint with the sender.
They can attach the PEM in email or Proton Mail, send it as a WhatsApp personal
message, or paste the full PEM block into a message. If an email system blocks
the `.pem` extension, rename the public-key file to `rsa-public.txt`; the
file contents stay exactly the same. The extension does not change the key.

Keep both PEM boundary lines and the complete Base64 body intact:

```text
-----BEGIN PUBLIC KEY-----
...Base64-encoded SPKI data...
-----END PUBLIC KEY-----
```

If a mail client strips only the boundary lines, restore those exact lines
around the complete, unchanged Base64 body before saving it as `rsa-public.pem`.
Do this only when the recipient confirms the body came from Zodiac's SPKI public
PEM; do not wrap an OpenPGP `PUBLIC KEY BLOCK`, certificate, or private key.

When a signed receiver release is available, verify its signature, expected
publisher and full SHA-256 through an independent trusted channel before use.
Save the sender's raw `.txt` file, then run the receiver with the encrypted key
and a new output filename:

```powershell
.\zodiac-decrypt.exe decrypt --key ".\rsa-private-encrypted.pem" --in ".\ciphertext.txt" --out ".\message.txt"
```

The receiver asks for the passphrase at a hidden local terminal prompt and
saves authenticated plaintext to a new private local file. It does not print
the message or open an editor. The file persists until you manage it. Keep the
receiver separate from the private key; never upload private keys or
passphrases. See the [recipient guide](src/pages/receive.astro) for exact
setup, readiness, backup, supported Windows paths and troubleshooting. Until a
verified release exists, this command is available only in the unsigned
development receiver; use synthetic data.

For a key pair dedicated to one message, the receiver also offers opt-in,
Windows-only best-effort cleanup after you open/read the output and press
Enter:

```powershell
.\zodiac-decrypt.exe decrypt --key ".\one-time-private.pem" --in ".\ciphertext.txt" --out ".\message.txt" --cleanup-output --single-use-key
```

`--cleanup-output` selects the plaintext file for cleanup;
`--single-use-key` separately selects the encrypted private-key file. Without
those flags, files are preserved. The routine uses seven overwrite passes,
aligned no-buffering/write-through I/O, three randomized same-directory name
changes, and handle-based deletion. This is best effort: successful completion
does not prove that NTFS journal/MFT history, snapshots, SSD-remapped blocks,
backups, paging, or other copies were erased. The flags do not provide
ratcheting or protocol forward secrecy; see the [recipient guide](src/pages/receive.astro)
for limits and the independent-review status.

## Implemented in development

- Native WebCrypto: RSA-OAEP-SHA256 and AES-256-GCM.
- Default and custom recipient public keys with full SHA-256 fingerprints.
- Canonical Base64URL ciphertext, available through copy and `.txt` download.
- Deterministic celestial glyphs, matching mixed-view SVG/PNG artwork, and paginated archival printing with checked raw recovery rows.
- Offline Go decryption with an encrypted private key and hidden passphrase prompt.
- Static hosting, local source builds, and no message-processing backend, accounts, analytics, or message history.

**Send the raw ciphertext with the artwork.** The v1 recipient consumes Base64URL text, not PNG or SVG. Artwork is presentation; SVG import is outside v1.

### Security practices and limits

Each message uses a fresh AES key and authenticated encryption. The browser and
offline Go receiver enforce bounded, strict input parsing, and interoperability
tests check that they exchange the same ciphertext format. Zodiac clears
owned plaintext and key byte buffers on a best-effort basis; JavaScript strings,
browser internals, Go key objects, and operating-system copies cannot be
guaranteed erased. The format reveals message length and does not provide sender
authentication, forward secrecy, or post-quantum security. A hosted site can
also serve changed code, so browser encryption alone does not prove the deployed
site is trustworthy. These safeguards and limits do not replace an independent
integrated security review; that review and signed, independently verifiable
releases remain pending.

## Architecture

| Component | Stack |
| --- | --- |
| Website | Astro static output, Svelte 5, strict TypeScript |
| Browser cryptography | Native WebCrypto |
| Interface | Local CSS tokens and frozen Lucide-derived vector glyphs |
| Key generation | OpenSSL 3.5 LTS; RSA-3072 or RSA-4096, exponent 65537 |
| Receiver | Offline Go CLI; standard-library crypto and a fixed-profile PBES2 loader |
| Platform support | Go-maintained x/term and x/sys for terminal/platform handling |
| Hosting | Vercel primary; Cloudflare Pages and Netlify alternatives |

The website accepts public keys only. Custom public keys stay in tab memory;
there is no upload to a backend. The receiver handles private keys and
passphrases locally, without a listener, API, or network lookup.

## Development

The development sender now encrypts exact message bytes with default/custom public recipients and offers raw copy/download, immutable result details, retry, another-message and clear/navigation reset. E05 adds frozen celestial glyphs with bounded pagination and a legend, plus local raw/printed-row recovery with row/page and final envelope checks. The unsigned Windows receiver implements hidden-prompt key verification and authenticated decryption to exclusive private local-disk files. M0 is complete and M1 development acceptance passes. E06 SVG/PNG/print exports are implemented with exact raw delivery and checked archival recovery. Actual Gmail (primary)/Outlook (secondary) draft paste, observed recipient readiness, final offline delivery, integrated QA-03 and release signing remain pending. See [sharing and print checks](docs/exports.md). Use synthetic data; no reviewed release is available. See [live task and milestone status](docs/status.md) and the [recipient readiness trial](docs/reviews/rec03-readiness-trial.md).

Use Node.js 24.21.0 (the 24.x LTS line), pnpm 12.8.1 and the committed lockfile. Receiver checks require the pinned installed Go 1.27.1 toolchain; automatic toolchain downloads are disabled. OpenSSL is needed for key setup and interoperability fixtures, not for running browser encryption or the packaged receiver. Configure `ZODIAC_GO` when the pinned Go executable is outside PATH; the scripts also recognize the repository's ignored portable-toolchain cache.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

For the built sender with production security headers:

```sh
pnpm build
pnpm start:local
```

`pnpm local` combines building and local serving. `pnpm local:custom` runs the explicit custom-recipient-only mode when no default public key is configured. Local servers bind to loopback by default. Development HMR is separate from the production CSP.

For the preview at **http://127.0.0.1:4324/**:

```sh
pnpm preview:local
```

Keep that terminal running. After source changes, run this in a second terminal:

```sh
pnpm preview:refresh
```

Then reload the browser tab (Ctrl+F5); reloading clears the in-memory workspace.
Both commands build the configured public recipient with production security
headers. Refresh publishes a complete immutable snapshot and matching CSP;
a failed build leaves the previous preview available. Snapshots stay in ignored
`.cache/preview-sites/`. Stop the preview terminal with Ctrl+C.

### Default recipient

1. Place the recipient's **public SPKI PEM** at `public/keys/recipient-public.pem`.
2. Configure the recipient name, public-key path, and independently confirmed full fingerprint in `config/recipient.json`.
3. Build the site. Missing, unsupported, mismatched, or known test keys must fail a production build.

The operator-confirmed Zodiac Modern recipient is configured; its public fingerprint and browser evidence are recorded in [the status report](docs/status.md). Private keys and release-signing credentials belong outside the repository by default; the explicitly authorized `.local/recipient` custody folder is ignored and excluded from build inputs. Custom recipient keys stay in tab memory; reloading clears them. Never use a throwaway generated key as a production default.

### Provisioning the repository's default recipient (operators only)

This is for the project operator configuring the website's default recipient,
not for ordinary senders choosing a custom recipient. Use the local setup
script only in your own trusted interactive PowerShell console. Generate two
independent random ASCII passphrases with
[New-ZodiacPassphrase.ps1](scripts/New-ZodiacPassphrase.ps1) or a trusted
password manager. Never run production passphrase generation in an assistant or
captured terminal, transcript or recording.

```powershell
& .\scripts\New-ZodiacPassphrase.ps1
# Repeat independently for the final passphrase; store both securely.
New-Item -ItemType Directory -Path .\.local -Force
& .\scripts\create-recipient.ps1 -Destination .\.local\recipient -OpenSSL 'C:\Program Files\FireDaemon OpenSSL 3.5\bin\openssl.exe' -Receiver .\receiver\bin\zodiac-decrypt.exe -Bits 4096 -RecipientName 'Zodiac Modern recipient' -ConfigureRecipient
```

The setup script verifies the FireDaemon signature, installs a protected
current-user folder ACL before key generation, refuses existing destinations,
runs hidden OpenSSL/receiver prompts, and requires local full-fingerprint
confirmation before copying only public PEM/config into build inputs. The
development receiver is unsigned. Keep the weaker encrypted intermediate until
final-pair and encrypted-backup readiness checks pass. See the [offline key
setup guide](src/pages/keys.astro) and [passphrase guidance](docs/passphrases.md).

### Checks

```sh
pnpm check
pnpm test
pnpm test:receiver
pnpm verify:receiver-deps
pnpm check:rec01
pnpm check:m1
# Complete export/PDF/Go + stable Edge evidence (pinned PDF QA renderer required)
pnpm check:m3
pnpm check:m4
pnpm build:custom
pnpm build:test
pnpm spike:offline-html
pnpm test:interop
pnpm test:e2e
pnpm build
pnpm check:artifact
```

Install the pinned Playwright browsers with `pnpm exec playwright install chromium firefox` before browser tests. Build both custom-only (`dist`) and fixture (`artifacts/test-site`) artifacts before `test:interop` or `test:e2e`; the suite serves them with production headers on loopback ports 4322 and 4321. The standalone shared Svelte sender prototype uses synthetic keys and is not a release sender. Production `pnpm build` passes with the operator-confirmed public configuration; missing or invalid configuration still fails closed.

Use synthetic messages and labeled test keys. Receiver validation includes real OpenSSL 3.0/3.5 fixtures, independent OpenSSL oracle comparisons, strict profile/schema failures, pre-KDF stub fuzzing, bounded post-KDF fuzzing, and vendor integrity. For `pnpm test:receiver-oracle`, set `ZODIAC_OPENSSL30` and `ZODIAC_OPENSSL35` to the recorded executable versions in the fixture manifest. Testing an older generator does not broaden the accepted key-file profile. See [loader implementation and review limits](docs/decisions/rec01-fixed-loader.md).

`pnpm check:m1` requires the current passing receiver snapshot (`pnpm check:rec01`, then `node scripts/snapshot-rec01.mjs`). It records formatting/types, unit tests, fixture/custom static builds, the bundled synthetic sender and real Chromium/Firefox UI/WebCrypto/Go command checks. With public recipient configuration present, it also checks the production build and actual browser default/fingerprint/public export; otherwise it requires production refusal. Evidence is author-run, not an integrated audit. The workflow stays a template under `workflows/` by user choice.

## Recipient workflow

The recipient generates the key pair once using the [encrypted OpenSSL setup](plan.md#creating-ones-own-key-one-time-openssl-setup), then sends the sender only `rsa-public.pem` (SPKI PEM) and its full SHA-256 fingerprint. Attach the PEM to an email/Proton Mail message, send it as a WhatsApp personal message, or paste the complete PEM block into a message. If `.pem` attachments are blocked, rename the public file to `.txt`; do not change its contents.

The key must retain the exact `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` lines and the complete Base64 body. If a mail client strips only those lines, they can be restored around the intact body before saving as `rsa-public.pem`, provided the recipient confirms it came from Zodiac's SPKI public-key file. Do not add these lines to an OpenPGP `PUBLIC KEY BLOCK`, certificate, or private key. Never send `rsa-private-encrypted.pem` or its passphrase.

There is no signed receiver download yet. For development-only tests, build the
unsigned receiver from the repository with `pnpm build:receiver`; it creates
`receiver/bin/zodiac-decrypt.exe`. Use only synthetic keys/messages until the
release is signed, independently reviewed and its trust channel is published.
Keep all recipient private files outside the checkout. Once a verified release
is available, save the sender's raw ciphertext and run the executable with the
new output path:

```powershell
.\zodiac-decrypt.exe decrypt --key ".\rsa-private-encrypted.pem" --in ".\ciphertext.txt" --out ".\message.txt"
```

It accepts a strict raw file with no whitespace stripping, unlocks the encrypted key through the hidden controlling terminal and authenticates before creating a new owner-only private file. Windows fixed local disks with ordinary native volume mappings and persistent ACLs are supported. UNC/network, device/extended paths, drive aliases/streams, reserved names, symlink/reparse parents and overwrite are rejected; other OS filesystems currently fail closed. No Go/OpenSSL runtime is needed by the built executable. See [the filesystem decision and tests](docs/decisions/rec02-local-output.md).

Verify any future release's expected publisher and artifact hash through an independently trusted channel before execution. For Windows OpenSSL setup, use an independent random **24–32 character ASCII** passphrase for each temporary/final key file; eight characters is too weak. See [entropy and unbiased offline generation](docs/passphrases.md). Windows OpenSSL interactive non-ASCII compatibility remains unclaimed.

## Message format

The compatible envelope is:

```text
RSA-wrapped AES key || nonce (12 bytes) || GCM tag (16 bytes) || ciphertext
```

Each message uses a fresh random 32-byte AES key. RSA-OAEP with SHA-256/MGF1-SHA-256 and an empty label wraps that key; AES-256-GCM encrypts the message with a 12-byte nonce and a 128-bit tag. The GCM additional authenticated data is `wrappedKey || nonce`. WebCrypto returns `ciphertext || tag`, which Zodiac splits and reorders into the envelope shown above. The envelope is encoded as canonical Base64URL without padding. Glyph data, fingerprints, and export labels remain outside it.

This is a sound hybrid-encryption construction for its conventional threat model: RSA-OAEP protects the small random message key, while AES-GCM provides message confidentiality and detects ciphertext tampering. The choices follow the [W3C WebCrypto](https://www.w3.org/TR/webcrypto/) RSA-OAEP/AES-GCM definitions, [RFC 8017](https://www.rfc-editor.org/rfc/rfc8017/) RSAES-OAEP, and [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final) GCM design. This construction assessment is not an independent audit or proof of the complete product.

Successful authentication does **not** identify the sender: anyone with the recipient's public key can create a valid encrypted message. The format is also not post-quantum. If a reused RSA private key is later compromised, retained ciphertext addressed to it may be exposed. A dedicated, independently verified one-time RSA key could compartmentalize messages if it is not copied or reused and is later made unavailable; deletion is best effort, not guaranteed erasure. Zodiac's integrated create/verify/use/retire workflow for one-time keys is not implemented, so do not assume that workflow is available today.

The private-key file uses a separate fixed PBES2/PBKDF2-HMAC-SHA256/AES-256-CBC profile. CBC key-file encryption has no authentication tag; its parser and unlock policy require independent review. See the [cryptographic specification](plan.md) for exact bounds, offsets, and failure behavior.

## Deployment and offline use

Build static assets with `pnpm build`. Vercel deployment uses `pnpm build:vercel` to generate static Build Output configuration and headers from the exact built artifact. No Astro runtime adapter, serverless functions, or message API is required. Alternative hosts must pass the same final-origin header and privacy checks; Surge support is conditional on enforceable headers.

The proposed free Vercel address is `zodiac-modern.vercel.app`; it has not been
claimed or verified here. See [static host instructions](docs/deployment.md),
[E07 hardening](docs/hardening.md) and the [M4 review packet](docs/reviews/m4-review-packet.md).
`pnpm check:m4` includes frozen offline installation, fresh REC-01/vendor/fuzz
gates, all M3 browser/unit/build/PDF checks and hardening/output/provenance checks.
Configure both recorded OpenSSL oracle paths as above. Signing, independent
release trust and integrated review remain pending; the command does not deploy.

Local source use is supported separately from a downloadable offline sender. A self-contained HTML sender must pass the browser/export/CSP verification spike before release; a native localhost launcher is the conditional fallback. Independently trusted release hashes are required for either artifact.

## Security boundaries

The intended sender processes messages locally, but a compromised host can replace JavaScript or the public key. CSP and hashes served only by that same host cannot establish honest code. When the host is untrusted, verify local sender bytes independently **before typing**. Static hosts still receive ordinary asset-request metadata.

The compatible format exposes message byte length and provides no sender authentication, forward secrecy, or post-quantum security. Exported files, clipboard contents, printing, runtime memory, and OS caches cannot be guaranteed erased. A default recipient holding the private key can decrypt ciphertext shared with them.

IND-CCA2 resistance is a design objective requiring qualified review of the complete construction and receiver. Tests and standard primitives are not a proof, audit, regulatory approval, or FIPS certification. This project does not implement a zero-knowledge proof protocol.

## Documentation and contributing

- [Architecture and security specification](plan.md)
- [Delivery backlog and acceptance criteria](backlog.md)
- [Contributor instructions and security invariants](AGENTS.md)
- [Go envelope reference](reference_impl.go.md)

Preserve the envelope and frozen glyph mapping. Record protocol/key-policy changes, satisfy the relevant acceptance criteria, and keep implementation tests, focused loader review, and integrated security review distinct. The loader's fixture/fuzz/resource/vendor/review gates begin in M0 and remain mandatory through release.

Keep real messages, private keys, and signing credentials outside the checkout and out of issues/PRs. [.gitignore](.gitignore) excludes common secrets, local exports, and build artifacts, with explicit exceptions for the public-key location and synthetic key fixtures. Ignore rules do not inspect contents or remove already tracked secrets.
