# Zodiac Modern

Local-first message encryption with a browser sender, celestial glyph artwork, and an offline Go recipient tool.

Choose a recipient public key, encrypt a message locally, and share the ciphertext. Keep private keys and decryption on the recipient's device.

## Using Zodiac Modern

**Availability:** this is a development project. There is no reviewed website
origin or signed receiver download yet. Use synthetic messages and test keys
until an independently verified release is announced. The proposed
`zodiac-modern.vercel.app` address is not verified or claimed here.


## Conditional security assessment

**If finished and independently reviewed, Zodiac's core design looks solid for
sharing secrets under the right threat model.** Its conventional hybrid combines
a fresh random 256-bit AES key with RSA-OAEP/SHA-256 and AES-256-GCM. Restricted
RSA parameters, authenticated envelope fields, canonical public-key validation,
bounded parsing and best-effort secret-buffer cleanup support that design.

The browser accepts public keys only; private keys and passphrases stay with the
offline Go receiver. This is a reasonable usability/security trade-off for
one-off or occasional confidential messages between people who independently
verify the recipient's key and trust their devices. The message limit is
65,536 UTF-8 bytes (64 KiB).

This assessment is conditional: it does not establish equal trust with age or
GnuPG, a completed audit, certification or release readiness. The current
envelope does not authenticate senders or provide post-quantum protection;
reused private-key compromise can expose saved messages. Browser memory and
delivered-page integrity remain security boundaries, and encrypted private-key
files need strong passphrases and careful custody. Independent integrated review,
trusted signed releases and remaining user/platform trials are still required.
See the [recorded feedback and qualifications](docs/reviews/research-code-review.md).

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

### Advantages of this approach

**Designed for one-off messages from contacts who do not use command-line
security tools.** The sender can open a verified page, confirm the recipient’s
public-key fingerprint, type a message and download ciphertext without
installing age, configuring GnuPG or handling a private key. The recipient
keeps key generation and decryption in local tools.

Reducing setup steps can make it easier for a non-technical contact to complete
the encrypted workflow instead of falling back to an unencrypted message.
That is Zodiac’s intended usability advantage; observed first-time user trials
are still needed to establish how well it works. Native WebCrypto supports
the browser-side encryption without an additional cryptographic library.
A phone or PC browser does not require the sender to learn terminal commands,
but supported-platform validation still applies.

A verified sender and a trusted device remain necessary. Zero installation
does not make an arbitrary, shared or compromised device safe, and browser
memory exposure is not quantified as negligible. The interface can help
prevent mistakes, but public-key verification and safe sharing still require
user judgment. This is a different workflow from age/GnuPG, not evidence of
superior cryptographic security or an impossible-to-misuse product.

- **A browser sender with no application installation.** Senders can encrypt
  using native WebCrypto; the recipient uses the separate offline Go tool.
- **Recipient private keys stay outside the sender page.** Senders need only
  a public key. They do not need the recipient’s private key or its passphrase,
  and there is no shared message password to deliver separately. Verify the
  recipient’s public-key fingerprint through a trusted independent channel.
- **Encryption happens locally.** The static application has no message
  processing API, account database, analytics or automatic message/history
  storage. Users choose when to export or share ciphertext. A verified
  self-contained HTML candidate also provides a local sender option, subject
  to the remaining delivery and review gates below.
- **Each message has fresh encryption material and tamper detection.**
  A random AES-256 key and nonce protect each message; RSA-OAEP wraps the key
  and AES-GCM authenticates the ciphertext and bound envelope context.
- **Portable sharing and local recovery.** Raw ciphertext can travel as text,
  an attachment or a download link. Decryption needs no Zodiac server, and
  strict bounded parsing rejects malformed inputs before releasing plaintext.
- **Visual ciphertext for sharing, print and PDF archives.** The celestial
  grid mixes symbols and Base64URL characters, with optional PNG/SVG artwork
  and paginated archival print output. Use the browser’s **Print / Save as PDF**
  to keep a visual document, or print every archival page on paper. Row/page
  check codes help locate transcription mistakes. Keep the raw ciphertext
  `.txt` alongside the artwork for the v1 receiver; PDF/PNG artwork is not a
  supported automatic recovery format. This is a visual presentation of
  cryptographic ciphertext, not visual cryptography based on secret image
  shares, and symbols add no encryption strength.

These are architectural and usability benefits, not a claim that Zodiac is
more secure than age or GnuPG. Browser plaintext may remain in text/undo buffers
and runtime memory after clearing; JavaScript cannot enforce memory locking
or guaranteed erasure. The offline receiver also provides only best-effort
buffer cleanup. Encryption does not prove sender identity, hide transfer
metadata, or provide post-quantum protection. Independent integrated review
and independently verifiable releases remain open.

### Three-part flow and security boundaries

1. **Recipient: generate keys locally with PowerShell and OpenSSL.** The
   [key setup](src/pages/keys.astro) verifies the expected OpenSSL publisher
   signature and installs a protected current-user Windows folder ACL before
   generating RSA-3072 or RSA-4096 keys. The final encrypted PKCS#8 private key
   uses PBKDF2-HMAC-SHA256 with 600,000 iterations, a 16-byte salt and AES-256-CBC.
   Use a strong randomly generated passphrase. Share only the SPKI
   `rsa-public.pem`; keep the encrypted private key and passphrase on the
   recipient's trusted device, with any backups controlled separately.
2. **Sender: encrypt in the browser with native WebCrypto.** The sender imports
   only the recipient's public PEM, confirms its independently verified full
   fingerprint, and enters the message. A fresh AES-256 key and nonce protect
   each message; RSA-OAEP/SHA-256 wraps the AES key. The sender page never imports
   a private key or requests its passphrase. Download the ciphertext `.txt` and
   share it through a message, email attachment or browser-download link such as
   Proton Drive or Wormhole. Zodiac performs no upload itself.
3. **Recipient: decrypt locally with the Go CLI.** The receiver reads the raw
   ciphertext and encrypted private-key file, prompts for the passphrase through
   a hidden terminal prompt, and validates the constrained standard PKCS#8/PBES2
   ASN.1 profile. It authenticates the message before creating a protected
   plaintext output file. The receiver has no listener or network service and
   does not require a browser. It clears owned secret byte buffers where
   possible; Go/runtime/OS copies cannot be guaranteed erased.

The intended path is **local key generation → public key to sender → browser
encryption → ciphertext sharing → local Go decryption**. Public-key delivery
and [independent fingerprint verification](#verify-who-owns-the-public-key)
are separate steps: transporting a PEM does not establish whose key it is.

This separation keeps recipient private-key handling outside hosted JavaScript.
The sender still trusts the code that handles its plaintext: verify the chosen
sender artifact before entering sensitive content. Moving decryption to another
browser tab would put the private key and passphrase inside that page's trust
boundary; a separate tab alone does not preserve the current separation.
ACLs and passphrase protection do not make a connected device offline or protect
against a compromised account/device. Exported plaintext persists until the
recipient manages it, and buffer/file cleanup remains best effort. Encryption
does not authenticate the sender or conceal sharing metadata. Independent review,
verified release delivery and human usability validation remain required.

### Encrypt and share

1. Open the verified sender. Compare the complete recipient fingerprint with
   the value you verified through a trusted separate channel. Encryption permission
   is enabled by default; the checkbox does not prove that comparison happened.
   Type the message and choose **Encrypt message**.
   Encryption runs in the browser; the site accepts public keys only.
2. To address a different recipient, ask them for their `rsa-public.pem` and
   the complete SHA-256 fingerprint through a trusted channel. Choose **Use a
   custom public key**, paste the PEM or select its file, and compare the full
   fingerprint in **Recipient details** with the value you verified. The key
   stays in this tab's memory and is cleared on reload.
3. After encryption, the raw Base64URL ciphertext and glyph artwork appear
   together. **Copy raw** or **Download ciphertext (.txt)** for delivery; the
   receiver needs the exact raw text. The glyph grid and exported PNG/SVG are
   visual presentation and cannot be decrypted by the v1 receiver.
4. For archival use, **Archival pages and print** is expanded by default to save pages or print / save
   as PDF. Full print includes every page; selected-page output is partial.
   Printed row recovery and page checks help detect transcription mistakes.
   See [sharing, exports and print](docs/exports.md) for clipboard limits,
   supported browser evidence and recovery instructions.

**Sharing routes:** send the raw ciphertext in an email body or `.txt` attachment, or upload the exported `.txt` to **Proton Drive, Google Drive, Wormhole, or MEGA (mega.nz)** and share a browser-download link. Zodiac exports files locally; it does not upload to or integrate with these services. The recipient downloads the ciphertext and uses the offline receiver with the matching private key. Optional PNG/SVG artwork can accompany it, but does not replace the raw `.txt`. Link access controls do not authenticate the sender, and a service may still see account/transfer metadata. Provider-specific upload/download trials remain unverified.

Additional manual ciphertext carriers include OneDrive, iCloud Drive, Dropbox, WeTransfer, MediaFire, TeraBox, Box, and Sync.com. Proton Drive remains the preferred route in this guide. This list describes delivery options, not a provider-security ranking or completed compatibility trials. Zodiac encryption protects the ciphertext contents; provider account security, metadata, link permissions and retention need their own assessment.

**Recommended delivery options (no Tor/qBittorrent install for the recipient):**

1. **Proton Drive link — default when you want expiry/revocation controls.** Use viewer-only access, a short expiry, and optionally a strong link password sent separately. The recipient can download in a browser. Proton Drive sharing is tied to the sharer's account and exposes link activity metadata; revocation cannot erase a file already downloaded.
2. **Proton Mail attachment — convenient if both parties already use Proton Mail.** The attachment is Zodiac ciphertext, so the recipient's private key is still required to read it.
3. **Gmail attachment — convenient fallback.** It carries the Zodiac-encrypted ciphertext, while ordinary email metadata (sender, recipient, time, subject and file size) remains visible to the mail service.
4. **Wormhole link — convenient expiring browser transfer.** Treat the entire link as a secret because it contains the Wormhole file-transfer key. Anyone who gets the link can retrieve the transferred file, but Zodiac ciphertext still requires the recipient's private key to decrypt.

Email sharing also covers Outlook/Microsoft 365, iCloud Mail and other MIME mail providers. Raw text or a `.txt` attachment is the portable delivery baseline; image paste and attachment filtering vary by client. Gmail, Outlook, Proton Mail and iCloud Mail are the priority compatibility checks, with actual provider trials still pending.

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
When cleanup is requested, the receiver also checks for Windows shadow-copy
device names visible to its process. This advisory can miss snapshots; an empty
result does not establish that snapshots or other copies are absent.

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

### Choosing OpenSSL 3.5 LTS on Windows 11

**Recommendation: prefer FireDaemon for Zodiac’s currently tested Windows
key-setup flow, provided it supplies the latest patched 3.5.x release.** This
is an integration/provenance recommendation, not proof that one vendor’s
cryptography is stronger. OpenSSL 3.5 LTS has upstream support through
8 April 2030. [OpenSSL support policy](https://openssl-library.org/post/2025-02-20-openssl-3.5-lts/)

Comparison checked 2026-10-10; vendor pages and package catalogs can change.

| Distribution | Useful evidence and tradeoffs | Zodiac recommendation |
| --- | --- | --- |
| **FireDaemon** | Documents signed executables/DLLs/installers, published SHA-256 hashes, public build scripts, portable packages and mitigations for automatic configuration loading. | Preferred existing integration: our setup helper requires a valid `FireDaemon Technologies Limited` publisher signature, and FireDaemon-generated key files have been tested. Use the latest patched 3.5.x, not an old fixture version. [Vendor documentation](https://www.firedaemon.com/firedaemon-openssl), [downloads](https://www.firedaemon.com/download-firedaemon-openssl). |
| **Shining Light Productions** | Provides Windows installers, a Light edition sufficient for many CLI uses, and published installer hashes. Its official hash manifest lists 3.5.9. Its page describes default OpenSSL builds. | Reasonable alternative after verifying the exact installer, executable/DLL signatures, dependencies and key-file profile. Not tested or accepted by our current publisher-gated helper. [Vendor downloads](https://slproweb.com/products/Win32OpenSSL.html), [official hash manifest](https://github.com/slproweb/opensslhashes/blob/master/win32_openssl_hashes.json). |
| **TaurusTLS** | Documents Azure Trusted Signing for Windows binaries, HybridCRT packaging, public build automation and multiple architectures/installers. Those are vendor claims, not an independently reproduced build here. | Promising alternative, especially when it delivers upstream patches sooner. Qualify its exact publisher, binaries and generated profile before adding helper support. [Build/distribution repository](https://github.com/TaurusTLS-Developers/OpenSSL-Distribution), [releases](https://github.com/TaurusTLS-Developers/OpenSSL-Distribution/releases). |
| **`Softwareminers.OpenSSL` via winget** | The exact `winget search --id Softwareminers.OpenSSL --exact --source winget --disable-interactivity` query returned no matching package during this check. Its publisher and download provenance remain unverified. | Do not recommend this ID or substitute a similarly named package blindly. Winget is a delivery mechanism, not an OpenSSL implementation or security endorsement. [Microsoft package search guidance](https://learn.microsoft.com/en-us/windows/package-manager/winget/search). |

**Patch currency takes priority over the preferred vendor.** At this check,
upstream had released [OpenSSL 3.5.9](https://github.com/openssl/openssl/releases/tag/openssl-3.5.9)
as a security patch, and [TaurusTLS listed 3.5.9](https://github.com/TaurusTLS-Developers/OpenSSL-Distribution/releases/tag/v3.5.9);
FireDaemon’s download page still listed 3.5.8. Recheck before downloading.
Prefer a verified current build over an older build merely because it is from
our usual distributor; these observations do not establish that older
versions’ specific advisories affect Zodiac’s RSA key-generation commands.
Our current helper will reject alternate publishers: support would require
reviewed publisher-policy changes and synthetic interoperability tests, not
removing signature verification.

Download from the vendor’s direct source, verify the installer/archive SHA-256
against its published value and valid Authenticode signatures against the
expected publisher, including the executable and loaded DLLs. Use matching
x64 binaries for Intel/AMD Windows 11, a protected installation directory,
and an explicit executable path. Check `openssl version -a` and rerun the
synthetic encrypted-PKCS#8 profile/receiver checks after upgrading. A
same-site hash detects mismatches but does not independently authenticate a
compromised vendor site. Signing, EV certificates and malware scans are not
proof of bug-free crypto or guaranteed SmartScreen acceptance.

Existing RSA keys do not become incompatible when the OpenSSL distributor
changes, and changing or upgrading the tool alone does not require key
regeneration. The public key remains SPKI and the private key must retain
Zodiac’s exact accepted encrypted-PKCS#8 profile. Different command defaults
can produce an unsupported key-file wrapper; preserve the explicit parameters
and verify with synthetic fixtures. Rotate keys if compromise is suspected
or a relevant advisory requires it, not simply because a vendor changed.
Neither enterprise marketing nor a bundled FIPS provider establishes military
or government approval of this distribution or Zodiac.

All these builds implement OpenSSL; Zodiac still selects the exact RSA and
PBES2 profile itself. Do not enable a FIPS or legacy provider merely to improve
a ranking: installing a FIPS-capable distribution does not certify Zodiac.
OpenSSL is used for local key generation, not by the browser encryption or
packaged Go decryption runtime. OpenSSL explicitly does not endorse a
particular third-party distribution. [OpenSSL distribution policy](https://mirror.openssl-library.org/community/distributions/index.html)

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

The recipient generates a supported RSA key pair offline using the [encrypted OpenSSL setup](plan.md#creating-ones-own-key-one-time-openssl-setup): once for a reusable recipient key, or a fresh pair for each incoming message in the dedicated one-time-key flow. Send only `rsa-public.pem` (SPKI PEM). Email, a download link, or a known Signal/WhatsApp conversation can carry the public PEM; it is not secret. If `.pem` attachments are blocked, rename the public file to `.txt` without changing its contents. Confirm the complete fingerprint independently as described below.

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

### Verify who owns the public key

Receiving a public key and verifying its owner are separate steps. It is fine
to receive the PEM through the same email or file-sharing service that carries
ciphertext. The important protection is to confirm the **complete Zodiac
SHA-256 SPKI fingerprint** with the intended recipient through a separate,
already trusted channel, such as a known Signal/WhatsApp conversation or an
in-person comparison. Compare it with Zodiac's full displayed fingerprint,
then confirm the comparison before encrypting. Repeat this for every new or
replacement key, including a dedicated one-time key.

A PEM and fingerprint in the same email can both be substituted. A different
app is useful only when you know you are communicating with the intended
person; end-to-end encryption alone does not establish that identity. Signal
safety numbers check the messaging connection and are distinct from Zodiac's
RSA-key fingerprint. See [GnuPG's key-verification guidance](https://wiki.gnupg.org/WebOfTrust)
and [Signal's safety-number guidance](https://support.signal.org/hc/en-us/articles/360007060632-What-is-a-safety-number-and-why-do-I-see-that-it-changed).
Never share the private PEM or its unlocking passphrase.

### Dedicated per-message recipient keys

For a one-off message where reducing exposure to a later private-key compromise
matters, the recipient can generate a **fresh RSA pair for that incoming message**
instead of using a reusable recipient key. No long-term RSA master key is needed
in this mode. This is a dedicated single-use recipient-key workflow, not Signal's
X3DH prekey protocol or a ratcheting session. Signal's
[X3DH specification](https://signal.org/docs/specifications/x3dh/) combines
identity keys, signed prekeys, one-time prekeys and authenticated key agreement;
Zodiac keeps its existing RSA-OAEP/AES-GCM envelope.

1. **Generate and verify locally.** Use the supported PowerShell/OpenSSL setup
   in a new protected folder for this message, for example `key_msg_101`.
   Verify that the encrypted private key matches its public PEM. Record the full
   SHA-256 SPKI fingerprint and which sender/message this key is assigned to;
   do not put private-key files or passphrases in the website.
2. **Hand over only the public key.** Send the public PEM to the intended sender
   and confirm its full fingerprint through an authenticated channel. A Signal
   conversation whose safety number you checked with the person is one option.
   The Signal safety number verifies that messaging connection, not the RSA PEM;
   the sender must still compare Zodiac's displayed fingerprint. A PEM and
   fingerprint placed together in an unverified channel can both be replaced.
3. **Encrypt once in the browser.** The sender selects that public PEM, confirms
   the fingerprint and encrypts one message. Zodiac generates its usual fresh
   random AES key and nonce. Share the raw ciphertext `.txt`; tell the recipient
   which assigned key it uses through the delivery conversation. The encrypted
   envelope deliberately contains no key identifier.
4. **Decrypt and read locally.** Select the matching encrypted private key in
   the Go receiver. With `--single-use-key`, key cleanup is explicitly requested;
   add `--cleanup-output` if the plaintext file should also be removed. After
   authenticated output is written, the receiver waits at its finish prompt while
   you read the file. Cleanup is attempted after finishing, rather than silently
   deleting the key immediately on decryption. Check the reported outcomes.
5. **Retire the assignment.** Tell the sender not to use that public key again.
   Account for temporary encrypted keys, backups, sync and other copies when
   retiring the private key. Keep lifecycle records locally; filenames and
   assignment records can reveal metadata. Reusable-key mode remains available.

If every usable copy of this message's private key becomes unavailable, a later
compromise of other recipient keys does not recover this message's AES key from
its saved ciphertext. That benefit depends on key isolation and retirement:
best-effort overwrite/delete does not prove every copy is gone. Retained plaintext
can still disclose the message. This does not provide guaranteed perfect forward
secrecy, post-compromise recovery, sender authentication or post-quantum protection.
The cleanup implementation and complete lifecycle still need independent review.

**Key exhaustion and batches:** single use is a workflow rule; RSA/WebCrypto does
not prevent another encryption to the same public key. Once the private key is
retired, a newly sent message to that key cannot be recovered if no usable copy
remains. Obtain and verify a fresh public key before sending another message.
A local PowerShell helper generating a bounded batch of independently encrypted
key pairs (for example ten) is a useful follow-up, but is not implemented yet.
Each key needs a unique assignment and full fingerprint verification, and unused
private keys still need protection. Do not distribute the same unassigned batch
to multiple senders or tabs and assume they will consume it safely.

For now, generate and assign keys individually and select them manually in the
sender. Automatic browser batch consumption would need a separately designed
reservation/acknowledgement and retry policy: an export is not proof of delivery,
and concurrent tabs can select the same key. No batch upload, automatic consumption
or recipient-key lifecycle persistence is implemented in the sender.

### Two people exchanging messages

Zodiac supports independent encrypted messages in either direction, rather
than a stateful chat session. Alice and Bob each generate their own recipient
key pair offline, exchange only public PEMs, and independently verify each
other's full fingerprints:

| Direction | Sender selects | Recipient decrypts locally with |
| --- | --- | --- |
| Alice → Bob | Bob's verified public PEM | Bob's matching encrypted private PEM |
| Bob → Alice | Alice's verified public PEM | Alice's matching encrypted private PEM |

Each person selects the intended correspondent's public key for each message.
A reply uses the same ordinary encryption/export/offline-decryption flow.
Zodiac automatically generates a fresh random **AES key and nonce for every
message**; AES has a single symmetric key, not a public/private key pair. A
sender does not need their own RSA private key to encrypt to someone else.

For occasional, highly confidential one-off exchanges, a recipient can
generate a fresh, independently verified RSA pair dedicated to each incoming
message. Use its public half for one message, decrypt with the matching private
half, then optionally use the documented best-effort cleanup flags. Track
which private file matches each message; the envelope has no recipient key ID.
Do not retire a key while a message addressed to it still needs recovery.
Later recovery of that private key or a copy can still expose its ciphertext;
cleanup does not guarantee erasure. The manual flow and cleanup options are
available in development; integrated lifecycle validation and independent
review remain open.

Reusable recipient keys remain supported for convenience. Later compromise of
a reused private key can expose retained messages addressed to it. In either
mode, successful decryption does not prove who sent a message. A replacement
public key embedded in an encrypted reply still needs independent verification;
current unsigned messages do not authenticate that replacement.

**Recommendation for Zodiac v1:** keep the independent-message workflow,
usable in either direction, with optional dedicated one-time recipient keys
when the custody/verification work is appropriate. For an ongoing conversation
requiring session management, sender authentication and ratcheting, use an
established messenger such as Signal.

DH/ECDH establishes a shared secret; it does not deliver a PEM or establish a
person's identity by itself. Authenticated protocols add identity verification
and session rules: [X3DH](https://signal.org/docs/specifications/x3dh/#41-authentication)
still requires checking identity keys through an authenticated channel, and a
[Double Ratchet](https://signal.org/docs/specifications/doubleratchet/) manages
evolving message keys/state. Adding these to Zodiac would require a separately
specified, tested and independently reviewed protocol/key profile. It is not a
small fix to v1 key exchange, and no DH/chat protocol is implemented here.

## Message format

The compatible envelope is:

```text
RSA-wrapped AES key || nonce (12 bytes) || GCM tag (16 bytes) || ciphertext
```

Each message uses a fresh random 32-byte AES key. RSA-OAEP with SHA-256/MGF1-SHA-256 and an empty label wraps that key; AES-256-GCM encrypts the message with a 12-byte nonce and a 128-bit tag. The GCM additional authenticated data is `wrappedKey || nonce`. WebCrypto returns `ciphertext || tag`, which Zodiac splits and reorders into the envelope shown above. The envelope is encoded as canonical Base64URL without padding. Glyph data, fingerprints, and export labels remain outside it.

This is a sound hybrid-encryption construction for its conventional threat model: RSA-OAEP protects the small random message key, while AES-GCM provides message confidentiality and detects ciphertext tampering. The choices follow the [W3C WebCrypto](https://www.w3.org/TR/webcrypto/) RSA-OAEP/AES-GCM definitions, [RFC 8017](https://www.rfc-editor.org/rfc/rfc8017/) RSAES-OAEP, and [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final) GCM design. This construction assessment is not an independent audit or proof of the complete product.

Successful authentication does **not** identify the sender: anyone with the recipient's public key can create a valid encrypted message. The format is also not post-quantum. If a reused RSA private key is later compromised, retained ciphertext addressed to it may be exposed. A dedicated, independently verified one-time RSA key could compartmentalize messages if it is not copied or reused and is later made unavailable; deletion is best effort, not guaranteed erasure. Zodiac's integrated create/verify/use/retire workflow for one-time keys is not implemented, so do not assume that workflow is available today.

The private-key file uses a separate fixed PBES2/PBKDF2-HMAC-SHA256/AES-256-CBC profile. CBC key-file encryption has no authentication tag; its parser and unlock policy require independent review. See the [cryptographic specification](plan.md) for exact bounds, offsets, and failure behavior.

### Chosen-ciphertext resistance (IND-CCA2)

For IND-CCA2, imagine an attacker modifying an intercepted ciphertext and
repeatedly observing decryption results to learn its plaintext. More precisely,
the attacker must not be able to distinguish encryptions of equal-length
messages even with adaptive access to decryption of other ciphertexts; the
challenge ciphertext itself is excluded. RSAES-OAEP has adaptive
chosen-ciphertext security analysis under stated assumptions, but implementations
must avoid revealing useful information through errors or timing.
See [RFC 8017, section 7.1](https://www.rfc-editor.org/rfc/rfc8017.html#section-7.1).

Zodiac has the expected building blocks and several relevant safeguards:

- OAEP protects a fresh random AES key.
- GCM authenticates the ciphertext and `wrappedKey || nonce`.
- The receiver requires exactly 32 unwrapped key bytes.
- OAEP and GCM failures return the same envelope-decryption error.
- Plaintext is returned only after successful GCM authentication.
- Parsing is canonical and bounded; the receiver exposes no network decryption service.

These safeguards support chosen-ciphertext resistance as a credible design
objective. They do not establish a formal IND-CCA2 proof for Zodiac's exact
composition or implementation. Matching error messages does not prove identical
timing, and an offline receiver reduces remote exposure without proving this
property. QA-03 must assess the composition, parsing, failure behavior and
relevant side channels. Tests support compatibility and regression detection;
they are not a security proof.

IND-CCA2 does not establish sender identity, hide communication metadata,
protect a stolen private key or guarantee secure deletion.

### Why these algorithms and an offline Go receiver?

Zodiac v1 uses native browser WebCrypto for encryption and Go's standard-library
RSA/AES/GCM primitives for decryption. RSA-OAEP/SHA-256 + AES-256-GCM is a sound
conventional hybrid choice for this bounded, one-off message workflow. Together
with OpenSSL-generated encrypted PKCS#8 private keys and an offline Go receiver,
these are appropriate, defensible choices for the native-cryptography constraints.
No algorithm-choice defect requiring a redesign has been identified in the
inspection to date. They are not uniquely optimal, a perfect encryption system,
or evidence that the complete product has passed independent review.
Browser-to-Go interoperability tests support the implemented behavior; security
of the complete product also depends on implementation, recipient-key
verification, trusted delivery and the outstanding integrated review.

| Alternative | What it changes |
| --- | --- |
| X25519 + HKDF + an AEAD | Much smaller keys and encapsulations, typically faster public-key operations, and a different protocol/key profile. It does not automatically give stronger confidentiality than correctly used RSA-3072/4096. |
| ChaCha20-Poly1305 | A strong AEAD alternative, especially attractive for software performance without AES hardware acceleration. It is not categorically more secure than native AES-256-GCM. |
| HPKE (RFC 9180) | A standardized complete hybrid construction with a specified key schedule, domain separation, context rules and optional authentication modes. Adopting it requires a new reviewed protocol, not merely replacing RSA with X25519. |

As checked on 2026-10-10, native WebCrypto supports HKDF and current browsers also
support X25519: compatibility data lists Chrome 133+, Firefox 130+ and Safari
17+. Newer public-key designs therefore do not necessarily require external
cryptographic libraries. These capabilities have not been adopted or tested as
Zodiac's encryption profile; a change would require explicit browser support,
key-format, protocol and independent interoperability/review work.
See [browser compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/SubtleCrypto.json)
and [WebCrypto key derivation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey).

X25519 targets roughly 128-bit classical security. HKDF derives keys from shared
material; OAEP's MGF1 is part of RSA encoding, so they are not competing security
levels. X25519 alone supplies neither sender authentication, post-quantum
protection nor forward secrecy against later compromise of a reused recipient
private key. See [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748.html).

AES-GCM and ChaCha20-Poly1305 can both protect files or network messages. Both
require correct nonce handling; chunk ordering and truncation protection belong
to the surrounding protocol. Zodiac uses one GCM encryption per fresh random
AES key, a fresh 12-byte nonce, a 128-bit tag and a bounded message size.
ChaCha20's software implementation/performance advantages do not imply that
Zodiac needs to replace AES-GCM. See [RFC 8439](https://www.rfc-editor.org/rfc/rfc8439.html).

HPKE itself supports AES-256-GCM as well as ChaCha20-Poly1305. Its base mode has
no sender authentication; authenticated modes require additional keys and an
appropriate identity-verification workflow. Zodiac authenticates
`wrappedKey || nonce` as GCM additional data, but this useful binding does not
make its envelope HPKE or transfer HPKE's security analysis to it. Similarities
to JWE also do not establish JWE compliance.
See [RFC 9180](https://www.rfc-editor.org/rfc/rfc9180.html).

SPKI PEM contains the public key; the recipient's password-protected private
file is **encrypted PKCS#8**. WebCrypto can perform RSA-OAEP/AES-GCM decryption,
but does not directly import OpenSSL's encrypted PKCS#8 container. A browser
receiver would also need container parsing and unlocking code. The offline Go
CLI keeps private keys and passphrases outside hosted browser code. Its fixed
PBES2 loader uses standard cryptographic primitives, while the repository-owned
parsing/integration still needs its separate review gates; it is not a
handwritten cipher. See [WebCrypto import formats](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey).

Native WebCrypto avoids shipping a Go WASM runtime for algorithms the browser
already provides. This is an architectural benefit, not a guarantee of zero
maintenance, universally fastest execution or an audited complete application.
The v1 recommendation is to keep the current hybrid and prioritize independent
review, recipient identity verification, independently verifiable artifacts
and separately designed optional sender signatures.

### What we borrow from other tools, and why this architecture?

Good usability matters for technical users too. Clear recipient selection,
visible fingerprints, safe defaults and recoverable errors can reduce mistakes
for everyone. Zodiac's browser sender requires no installation or administrator
access; the recipient uses a separate local tool. This is a useful division of
responsibility, not a claim that a website is inherently safer than a CLI or that
the interface prevents every mistake.

**Public keys and password derivation solve different problems.** Zodiac creates
a fresh random AES key for each message and wraps it for the recipient's RSA
public key. The sender does not need a shared message password. Argon2id makes
guessing a password-derived key more expensive through memory and computation;
it does not add entropy to a weak password or authenticate the recipient. A
high-entropy generated password can also support strong symmetric encryption.
Do not compare a 4,096-bit RSA modulus directly with a password's length or AES
key size. See [Argon2's specification](https://www.rfc-editor.org/rfc/rfc9106.html).

Zodiac's private key still has a separate password-protection boundary: the
supported OpenSSL encrypted-PKCS#8 profile uses PBKDF2-HMAC-SHA256. Its security
depends on the generated passphrase, custody and work factor. Argon2id could be
evaluated for a future key container, but it is not a drop-in replacement for
the current fixed OpenSSL profile or a required change to message encryption.

[hat.sh](https://github.com/sh-dv/hat.sh) offers password and public-key file
encryption, using libsodium for Argon2id, X25519 and XChaCha20-Poly1305. Useful
lessons include bounded file processing and understandable key/password flows.
Zodiac keeps native WebCrypto RSA-OAEP/AES-GCM and Go's standard cryptographic
primitives because they already provide its required algorithms. Adding
libsodium would add packaging and dependency review without an identified need
in this message-only profile. Native primitives do not automatically validate
our surrounding protocol, parsers or application. Large-file streaming would
need a separate design for chunk ordering, truncation and authentication.

[encryptor.app's current source](https://github.com/georgerauscher/encryptor-app)
documents a bundled offline HTML, generated passwords, independent vectors and
a reproducible build. Zodiac already has a self-contained HTML **development
candidate** built from the same sender code; see the commands below. Final
versioned packaging, independently trusted hashes and release qualification
remain pending. Borrow its emphasis on readable source, exact build provenance
and test vectors, rather than treating single-file packaging as proof of safety.

[PrivateBin](https://github.com/PrivateBin/PrivateBin/wiki/Encryption-format)
stores encrypted pastes on a server and carries the paste key in the URL
fragment, with optional passwords and expiration/burn-after-reading behavior.
Zodiac deliberately has no storage backend. For its current use case, export
the ciphertext `.txt` and share it through an existing service such as Proton
Drive, which supports [passwords, expiration and revoked links](https://proton.me/support/drive-shareable-link).
This recommendation keeps storage, account security and operational maintenance
outside Zodiac; it is not a claim that one provider is universally safer.
Expiration or revocation stops future retrieval through the service; it cannot
erase already downloaded ciphertext or plaintext. Adding a paste server would
require a separate operational, retention, abuse and privacy threat model.

Keep Zodiac's no-history design: a local IndexedDB ciphertext shelf was
considered but is not selected. Improve explicit export and sharing guidance
instead, for Proton Drive, MEGA, Google Drive, Wormhole and mail providers.
Provider handoff must be user initiated and retain download/copy fallbacks;
one-click export does not imply automatic upload or a guaranteed provider share
link. Neither a paste server nor a database such as Neon is selected. Storage,
accounts and retention remain outside Zodiac.

A browser decryption page would bring private keys and passphrases into its
execution environment and require an encrypted-PKCS#8 importer. That changes
the current boundary. A future **offline receiver GUI** can improve usability
without making the hosted page a private-key tool. Electron or Tauri is an
optional packaging choice, not a cryptographic upgrade: both introduce native
capabilities and delivery/update boundaries to constrain and review. See
[Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
and [Tauri's security model](https://v2.tauri.app/security/).
For v1, keep the static website plus verified offline HTML option and the
separate Go receiver; prioritize review, trusted releases and real-user trials
before expanding the architecture. Neither these comparisons nor external
marketing establish that Zodiac or another browser tool has passed a system
audit. The [backlog](backlog.md) tracks the outstanding gates and future scope.

Optional future research would assess an exact [RFC 9180 HPKE profile](https://www.rfc-editor.org/rfc/rfc9180.html)
for smaller recipient keys and envelopes, and a signed portable Windows 11 GUI
that wraps the existing Go executable rather than ports its crypto or PKCS#8
loader to JavaScript. HPKE requires a separately reviewed protocol and migration
design; it does not automatically provide sender identity, forward secrecy or
post-quantum protection. A GUI requires its own native-boundary and delivery
review. Neither change is selected for implementation or an E08 prerequisite.

These would be **additional options**: retain the hosted browser sender for
mobile and desktop use on the go, the independently verified offline HTML sender,
and the offline Go CLI. A future desktop GUI would sit on top of Go; the optional
Go encryption command is tracked separately. No desktop installation would be
required to use the browser sender. GUI framework research will compare Tauri v2,
Wails/WebView2, WinUI 3/C#, Electron, Flutter, Avalonia/C# with
CommunityToolkit.Mvvm, Qt and wxWidgets, including portable runtime requirements
and accessibility. Avalonia with the MVVM Community Toolkit is the user's
preferred candidate to evaluate; WPF is excluded by preference. No framework
has been selected for implementation. See
[Avalonia MVVM guidance](https://docs.avaloniaui.net/docs/fundamentals/the-mvvm-pattern)
and [CommunityToolkit.Mvvm](https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/).

## Deployment and offline use

Build static assets with `pnpm build`. Vercel deployment uses `pnpm build:vercel` to generate static Build Output configuration and headers from the exact built artifact. No Astro runtime adapter, serverless functions, or message API is required. Alternative hosts must pass the same final-origin header and privacy checks; Surge support is conditional on enforceable headers.

The proposed free Vercel address is `zodiac-modern.vercel.app`; it has not been
claimed or verified here. See [static host instructions](docs/deployment.md),
[E07 hardening](docs/hardening.md) and the [M4 review packet](docs/reviews/m4-review-packet.md).
`pnpm check:m4` includes frozen offline installation, fresh REC-01/vendor/fuzz
gates, all M3 browser/unit/build/PDF checks, offline HTML integrity and
maximum-size/keyboard checks, and hardening/output/provenance checks.
Configure both recorded OpenSSL oracle paths as above. Signing, independent
release trust and integrated review remain pending; the command does not deploy.

Local source use is supported separately from a downloadable offline sender. A self-contained HTML sender must pass the browser/export/CSP verification spike before release; a native localhost launcher is the conditional fallback. Independently trusted release hashes are required for either artifact.

### Self-contained offline HTML sender

An additional option to the hosted Vercel sender is one downloadable HTML file,
built from the same Svelte sender, native WebCrypto, glyphs and export code in
the project's source repository. The builder embeds compiled JavaScript, styles and
runtime license notices; it needs no adjacent runtime assets. Open a verified
file directly with `file://` in a supported browser, then encrypt locally and
share its ciphertext with the recipient's separate Go receiver. An ordinary
Astro `dist/index.html` is not this bundled artifact.

The development build commands already exist:

```powershell
pnpm spike:offline-html custom
# Candidate with no default recipient: choose the recipient's public PEM.
pnpm spike:offline-html production
# Candidate with an explicitly configured, confirmed default public recipient.
```

Without a mode, `pnpm spike:offline-html` creates a **synthetic fixture**, not a
real recipient build. All modes currently use the prototype filename
`artifacts/offline probe שלום/zodiac-synthetic-probe.html`; finalized versioned
release packaging remains pending. See [deployment commands and limits](docs/deployment.md).

The `.mjs` builder uses ordinary JavaScript minification, checks for forbidden
adjacent/external `src`/`href` references, escapes closing-script sequences in
the compiled script, and hashes the exact embedded script/style blocks for a
restrictive CSP meta tag. These are useful build and browser-policy safeguards,
not obfuscation, an audit or a guarantee that every browser/export works offline.
The asset check alone is not a complete HTML/CSS/JavaScript security validator;
artifact and actual browser/no-request checks provide additional evidence.

**Verify the complete file before opening it or typing secrets.** Obtain its
expected SHA-256 through an independently trusted publisher/reviewer channel,
then use the existing helper:

```powershell
.\scripts\verify-sender.ps1 -Path '.\zodiac-sender.html' -ExpectedSHA256 '<independently obtained 64-hex SHA-256>'
```

The helper does not open the file. Embedded CSP hashes limit execution under
that policy, but an attacker able to replace the HTML can also replace its CSP
and hashes. They do not authenticate the whole file; a hash downloaded beside
it from the same compromised source is insufficient. File CSP also lacks
HTTP-only protections such as `frame-ancestors`, HSTS and `nosniff`.

Synthetic offline workflows pass recorded Chromium/Firefox and stable-channel
checks, including native encryption, independent Go recovery and exports.
Human usability, OS-enforced network denial, independent boundary/verification
review and final delivery selection remain open. This is a tested development
candidate, not a reviewed release or an unconditional air-gap guarantee. Keep
readable public source and exact release provenance; deliberate obfuscation adds
no cryptographic protection and makes review harder.

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
