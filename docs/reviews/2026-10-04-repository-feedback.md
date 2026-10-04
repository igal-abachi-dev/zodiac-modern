# Relayed repository and WebCrypto feedback

The user supplied two positive assessments on 2026-10-04. Reviewer identity,
execution environment and exact reviewed revision were not supplied. Preserve
them as feedback, not as a completed QA-03 assessment of the current changes.

The scheme comparison is consistent with the independently tested envelope:
fresh AES-256 material, OAEP SHA-256/MGF1-SHA-256 with empty label, fresh 12-byte
nonce, AES-GCM/128-bit tag, `wrappedKey || nonce` AAD and
`wrappedKey || nonce || tag || ciphertext`, canonical unpadded Base64URL. The
reference service and browser sender have compatible cryptographic transport;
their deployment and plaintext/private-key trust boundaries differ.

The review correctly described the snapshot as incomplete, unsigned and lacking
integrated review, production recipient configuration and an independent
publisher channel. Disabled message controls and missing decryption/output
described that earlier snapshot. These development flows are now implemented
and tested; completing them does not close the remaining release gates.

Clarifications carried into current documentation:

- Local execution does not establish an honest hosted frontend. A compromised
  host can replace JavaScript or the selected public key. Same-host CSP/hashes
  do not close that gap; verify independently trusted local sender bytes before
  sensitive typing when the host is untrusted.
- The claim that a provider never sees a secret requires actual trusted client
  execution and no other plaintext submission. Encrypting data after sending
  it to a model/provider cannot undo that disclosure. No automatic
  anti-distillation guarantee is claimed.
- Best-effort JavaScript clearing and Go clearing/`runtime.KeepAlive` both have
  runtime/OS-copy limits. `KeepAlive` is not a guaranteed secure-erasure claim.
- The tool versions are observed, not hypothetical: installed Node reports
  v24.21.0 and Go reports go1.27.1 windows/amd64; the official
  [Go download feed](https://go.dev/dl/?mode=json) was checked during this work.
  Evidence includes UTC timestamps; this workspace uses Asia/Jerusalem local
  dates. Exact version observations do not by themselves prove supply-chain
  provenance or patch suitability for a future release.
- Use random 24–32 character ASCII passphrases from a trusted local
  cryptographic generator. Eight characters is too weak; length/complexity
  alone cannot establish entropy. Uniform cryptographic `GetInt32` or rejection
  sampling avoids the bias of byte modulo 94. Repeated array fills overwrite
  prior draws; do not describe a portable RNG API as universally AES-CTR-DRBG.

The anonymous conditional REC-01 loader approval remains separately recorded.
Its scope does not extend to the new receiver filesystem integration or the
whole sender/receiver product. Signing, custody, full offline delivery and
integrated independent QA-03 remain open.
