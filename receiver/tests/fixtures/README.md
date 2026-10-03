# Synthetic keys only

Every PEM in `keys/` is a disposable test key generated for this repository.
The openly stored synthetic password is test data, never a real credential.
Never use these public or private keys for actual messages or production defaults.

Commit these fixtures and `manifest.json` so the real OpenSSL differential corpus
is reproducible. Production builds deny these fingerprints; artifact checks reject
private keys and receiver/test code in hosted output. All other PEM/private-key
paths are ignored by default. Production private keys belong outside the checkout.

The manifest records real OpenSSL 3.0.22 and 3.5.9 generators, executable hashes,
providers, commands, encrypted fixture hashes, public fingerprints and ASN.1
profiles. Original 3.0 output has an 8-byte salt and must be rejected by the fixed
16-byte minimum. Rewrapped fixtures use 3.5 with `-saltlen 16`; their canonical
public halves are unchanged. Decrypted oracle DER exists in process memory only.

`scripts/generate-key-fixtures.mjs` regenerates fresh randomized fixtures; doing
so reopens fixture evidence and requires updating the test configuration and
re-running loader, oracle, browser, fuzz and review gates. Supply isolated
generator paths through `ZODIAC_OPENSSL30` and `ZODIAC_OPENSSL35`.
