# REC-01: fixed-profile standard-library loader

Implemented in `receiver/internal/keyfile/pbes2.go` for Go 1.27.1. Production
primitives are native PBKDF2-HMAC-SHA256, AES/CBC, RSA and x509. A fixed-depth
RawValue schema walk validates complete nested SEQUENCEs through encoding/asn1;
there is no custom length/TLV parser, algorithm registry, decoder dependency,
OpenSSL runtime subprocess or unencrypted fallback.

The accepted profile remains PBES2/PBKDF2, explicit HMAC-SHA256 with DER NULL,
AES256-CBC, salt 16–64, iterations 600,000–2,000,000, keyLength absent/32, IV 16,
bounded whole blocks and exact version-0 two-prime RSA PKCS#8 with RSA NULL.
PEM input is bounded at 16 KiB; all 16 final-block bytes participate in the padding
check. Invalid profiles never call the KDF. Uniform local failure is exit 3 and
`unable to unlock private key`; it is not a timing-equivalence or authentication
claim for CBC containers.

Read-only inspected references:

- [youmark/pkcs8 at a2c0da244d782506f23dd28c916a6efc2b33f9d6](https://github.com/youmark/pkcs8/blob/a2c0da244d782506f23dd28c916a6efc2b33f9d6/pkcs8.go): wrapper/OID/operation ordering. Its broad registries, weak defaults, unencrypted path and incomplete nested consumption are not imported or copied.
- [.NET RSA at 6f1d9331b9b477df73982a0fabedefe27f36d8a3](https://github.com/dotnet/runtime/blob/6f1d9331b9b477df73982a0fabedefe27f36d8a3/src/libraries/System.Security.Cryptography/src/System/Security/Cryptography/RSA.cs): encrypted PKCS#8 import and private-parameter cleanup.
- [.NET password-based encryption at the same commit](https://github.com/dotnet/runtime/blob/6f1d9331b9b477df73982a0fabedefe27f36d8a3/src/libraries/Common/src/System/Security/Cryptography/PasswordBasedEncryption.cs): PBES2 ordering, parameter presence and temporary-key cleanup. Its broader BER/PRF/null-equivalence policy is not our acceptance policy.

No source was mechanically ported and neither reference is a production
dependency. No .NET oracle is claimed. Real OpenSSL 3.0.22/3.5.9 local oracles
compare canonical public halves; fixture hashes/profile details are in
`receiver/tests/fixtures/manifest.json`.

The hidden prompt uses pinned Go-maintained x/term v0.46.0 and x/sys v0.48.0.
The inspected upstream commits are term
`6226200ed12cba417a9d9e799c2a7179d3fc0e27` and sys
`613e2570718ecde85c04e69ebd5585c3881c442c`. Windows console raw mode comes from
x/term. Demand-driven reads prevent the Enter/read-ahead shutdown race; the
worker has a pinned OS thread so CancelSynchronousIo can interrupt its synchronous
console read. Pending console input is flushed before terminal restoration.
Password allocation is fixed at 1,024 bytes; oversized input is drained through
Enter without storing more bytes. Native platform calls and this terminal glue
remain in the focused review scope. Non-Windows terminal support is experimental
until actual platform testing; a cross-compile is not a usability test.

Owned password, derived-key and entire decrypted buffers are cleared. The native
PBKDF2 password string, Go/RSA/cipher internals, OS copies and exported files
cannot be guaranteed erased. Browser private-key import is not enabled.

The development executable currently supports `--help`, `--version`, and
`verify-key --key encrypted.pem --public public.pem`. It is unsigned and unreviewed.
Authenticated message decryption/private output remain REC-02. Do not use this
build for real secrets.

REC-01 is not Done until an independent focused reviewer assesses the owned
loader, schema/padding tests, resource/fuzz evidence and terminal/vendor glue,
and all findings are resolved and rechecked. Automated tests and author inspection
do not substitute for this gate or for QA-03's later integrated review.
