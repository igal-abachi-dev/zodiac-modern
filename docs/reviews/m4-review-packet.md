# M4 integrated review packet

Status: prepared for independent assessment; no integrated verdict or release.
The exact automated record is [e07-evidence.json](e07-evidence.json), referring
to source hashes in [m1-evidence.json](m1-evidence.json), refreshed
[REC-01 evidence](rec01-evidence.json) and [PDF/export evidence](e06-evidence.json).
All tests use designated synthetic keys/messages. The production build imports
only the separately confirmed public recipient. Never request production private
keys or real messages for this review.

## Assets, adversaries and boundaries

Protect original UTF-8 plaintext, per-message AES keys, local receiver password/
private key, recipient identity and release code provenance. Hosted processing
is an in-tab sender/recovery UI; offline Go handles private-key unlock and
authenticated plaintext output. Explicit clipboard/files/print exports persist
outside application history. RSA/AES/GCM and private-key parsing are separate
trust boundaries. Public hashes/check labels help detect copying errors and do
not authenticate a sender or artifact publisher.

Consider passive ciphertext observers, malicious envelopes/key files, malformed
public keys, clipboard/export substitution, transcription errors, hostile local
paths/reparse races and a replaced hosted sender/key/policy or copied lookalike.
Glyphs/literal characters/nulls are reversible presentation, not added secrecy.
Length is exposed. Compromised OS/browser/extensions, trusted recipient disclosure,
clipboard history/print spools and guaranteed erasure are outside the promised
protection. There is no sender authentication, forward secrecy or post-quantum
protection. A trusted local sender must be checked before sensitive input when
the host is untrusted; same-site hashes and TLS do not close that gap.

## Required technical assessment

1. Native WebCrypto RSA-OAEP SHA-256/MGF1-SHA-256, empty label; fresh 32-byte AES
   key and 12-byte nonce, AES-256-GCM/128-bit tag, AAD `wrappedKey || nonce` and
   exact `wrappedKey || nonce || tag || ciphertext` unpadded canonical Base64URL.
   Review construction/composition, original surrogate validation, UTF-8/bounds,
   errors, concurrency/reset/owned-buffer cleanup and independent Go agreement.
2. Fixed-profile stdlib PBES2/PBKDF2/HMAC-SHA256-NULL/AES256-CBC loader: strict
   nested ASN.1 consumption, pre-KDF bounds, padding scan, strict inner PKCS#8/
   two-prime RSA and uniform errors. Inspect real OpenSSL 3.0/3.5 oracle fixtures,
   pre/post-KDF fuzz/resource records and prior conditional focused disposition.
   CBC key files lack authentication; glue is not automatically constant-time.
3. Shipping Go command, controlling-terminal hidden prompt/cancellation, fixed
   32-byte unwrap, authentication before exclusive private output, Windows ACL,
   overwrite/symlink/junction/reparse/mapping/race behavior, cleanup and native
   vendor integrity. Check no listener/network client/secret argv/env/temp keys.
4. Enforced exact CSP, artifact/header synchronization, production DOM and
   export styles, SVG geometry, no workers/storage/telemetry, offline-after-load
   flows, navigation lifecycle and provider configuration. Delivered code can
   replace these controls if its publisher is untrusted.
5. Frozen glyph/transport grammar, complete raw recovery and S64CHECK1 page/row
   checks; trusted generated SVG/PNG/print limits and raw-only v1 receiver.
   Untrusted SVG/XML import is excluded and deferred to FUT-08.
6. EN-04 candidate full bundled file:// HTML with externally checked final bytes,
   meta/header limits, real stable-browser/default-settings and headed verification
   usability. Native launcher is only a conditional fallback; do not invent its
   asset-manifest/signing claims while it is unselected/unimplemented.
7. Custody/identity, independently trusted official origin/publisher/channel,
   review and signing before final hashes, incident/rotation owners and downloads.
   Proposed Vercel origin is not confirmed; no signed release exists.

## Review delivery and findings

Select a reviewer qualified for cryptographic composition, Go key-loader/terminal/
Windows output handling and browser/CSP/artifact delivery. Selection remains
pending. Record identity, tested revision/hash scope, tools/platforms, severity,
reproduction, limits and verdict. Link every required finding to a fix, and have
critical/high remediations independently rechecked. Author tests are not a
reviewer verdict; earlier focused REC-01 approval does not cover the full app.
Do not add formal IND-CCA2/FIPS/government/zero-knowledge/constant-time claims.

M4 also needs WebKit, real assistive technology, measured reference-device costs,
five novice receiver trials and Gmail-first/Outlook-secondary actual draft paste.
CI remains a template by user choice. Automated checks cannot approve these
human/provider/release gates. Current implementation and public wording remain
reviewable while those dependencies are pending.
