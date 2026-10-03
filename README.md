# Zodiac Modern

Local-first message encryption with a browser sender, celestial glyph artwork, and an offline Go recipient tool.

Choose a recipient public key, encrypt a message locally, and share the ciphertext. Keep private keys and decryption on the recipient's device.

## Planned first-release features

- Native WebCrypto: RSA-OAEP-SHA256 and AES-256-GCM.
- Default and custom recipient public keys with full SHA-256 fingerprints.
- Canonical Base64URL ciphertext, available through copy and `.txt` download.
- Deterministic celestial glyphs, complete one-line SVG export, PNG artwork, and paginated printing.
- Offline Go decryption with an encrypted private key and hidden passphrase prompt.
- Static hosting, local source builds, and no message-processing backend, accounts, analytics, or message history.

**Send the raw ciphertext with the artwork.** The v1 recipient consumes Base64URL text, not PNG or SVG. Artwork is presentation; SVG import is outside v1.

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

The website accepts public keys only. The receiver handles private keys and passphrases locally, without a listener, API, or network lookup.

## Development

The static scaffold, local public-key file/paste selection and fingerprint details, public-key/build validation, browser crypto library, independent Go test oracle and encrypted-key loader are implemented. The site currently shows disabled message controls; the unsigned receiver supports key verification only. Full sender UI, glyph/export/recovery flows and authenticated receiver decryption/output remain pending. No reviewed release is available. See [live task and milestone status](docs/status.md).

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

### Default recipient

1. Place the recipient's **public SPKI PEM** at `public/keys/default-public.pem`.
2. Configure the recipient name, public-key path, and independently confirmed full fingerprint in `config/recipient.json`.
3. Build the site. Missing, unsupported, mismatched, or known test keys must fail a production build.

Private keys and release-signing credentials stay outside the repository. Custom recipient keys stay in tab memory; reloading clears them. Never use a throwaway generated key as a production default.

### Checks

```sh
pnpm check
pnpm test
pnpm test:receiver
pnpm verify:receiver-deps
pnpm check:rec01
pnpm build:custom
pnpm build:test
pnpm spike:offline-html
pnpm test:interop
pnpm test:e2e
pnpm build
pnpm check:artifact
```

Install the pinned Playwright browsers with `pnpm exec playwright install chromium firefox` before browser tests. Build both custom-only (`dist`) and fixture (`artifacts/test-site`) artifacts before `test:interop` or `test:e2e`; the suite serves them with production headers on loopback ports 4322 and 4321. The standalone probe is explicitly synthetic and is not a release sender. Production `pnpm build` intentionally fails until real public configuration is supplied.

Use synthetic messages and labeled test keys. Receiver validation includes real OpenSSL 3.0/3.5 fixtures, independent OpenSSL oracle comparisons, strict profile/schema failures, pre-KDF stub fuzzing, bounded post-KDF fuzzing, and vendor integrity. For `pnpm test:receiver-oracle`, set `ZODIAC_OPENSSL30` and `ZODIAC_OPENSSL35` to the recorded executable versions in the fixture manifest. Testing an older generator does not broaden the accepted key-file profile. See [loader implementation and review limits](docs/decisions/rec01-fixed-loader.md).

## Recipient workflow

Generate the key pair once using the [encrypted OpenSSL setup](plan.md#creating-ones-own-key-one-time-openssl-setup). Share only the public PEM and confirm its fingerprint through a trusted channel.

After a verified receiver release is available, save the sender's raw ciphertext and run the executable from a private folder outside the checkout:

```powershell
.\zodiac-decrypt.exe decrypt --key ".\rsa-private-encrypted.pem" --in ".\ciphertext.txt" --out ".\message.txt"
```

This is the planned REC-02 command, currently unavailable. Its contract requires a hidden local passphrase prompt, authentication before creation of a new private ordinary local-disk file, no overwrite and validated parent directories/Windows ACLs. The eventual executable will require neither Go nor OpenSSL installation. Verify its expected publisher and artifact hash through an independently trusted channel before execution. For Windows interactive OpenSSL key setup, use a strong ASCII-only passphrase until non-ASCII console encoding interoperability has been proven.

## Message format

The compatible envelope is:

```text
RSA-wrapped AES key || nonce (12 bytes) || GCM tag (16 bytes) || ciphertext
```

Each message uses a fresh 32-byte AES key, RSA-OAEP with SHA-256/MGF1-SHA-256 and an empty label, and AES-256-GCM. Additional authenticated data is `wrappedKey || nonce`. The envelope is encoded as canonical Base64URL without padding. Glyph data, fingerprints, and export labels remain outside it.

The private-key file uses a separate fixed PBES2/PBKDF2-HMAC-SHA256/AES-256-CBC profile. CBC key-file encryption has no authentication tag; its parser and unlock policy require independent review. See the [cryptographic specification](plan.md) for exact bounds, offsets, and failure behavior.

## Deployment and offline use

Build static assets with `pnpm build`. Vercel deployment uses `pnpm build:vercel` to generate static Build Output configuration and headers from the exact built artifact. No Astro runtime adapter, serverless functions, or message API is required. Alternative hosts must pass the same final-origin header and privacy checks; Surge support is conditional on enforceable headers.

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
