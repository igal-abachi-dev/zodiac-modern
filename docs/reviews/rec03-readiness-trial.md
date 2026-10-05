# REC-03 readiness and first-time user trial

Implementation and author-run technical evidence exist; REC-03 completion awaits
the operator's actual backup drill and observed first-time user usability.
The receiver remains unsigned development software: use nonsecret data only.

Use the static `/receive/` instructions, an independently confirmed public PEM
and fingerprint, and a locally held encrypted private key. In an empty sender
workspace, select **Prepare nonsecret readiness token**, record its exact text
locally, encrypt, and download raw `ciphertext.txt`. Run the documented receiver
command to a new private output, enter the passphrase only at its hidden prompt,
and compare the saved bytes with that token through the existing trusted channel.

Restore the encrypted backup into a separate restricted nonsynced local folder.
Use the separately backed-up passphrase with `verify-key`, compare the actual
full public fingerprint, and decrypt the same raw file to a second new output.
Do not remove the encrypted intermediate until this succeeds. No OpenSSL step
is needed per message. No private key, passphrase, or plaintext is sent to support.

Have a first-time user repeat with synthetic material. Record only:

- Trial date, observer and participant role (first-time user/developer).
- Windows architecture/version, receiver file hash/version and browser version.
- Original-key and restored-key verification/decryption exit codes.
- Exact nonsecret token agreement and whether output location was understood.
- Needed assistance, ambiguous instructions, cancellation/retry observations.
- Guide changes and a follow-up trial if a step failed.

Technical baseline: [native backup drills](key-setup-evidence.json) prove both
supported RSA sizes can restore and decrypt exact synthetic bytes. Browser/CLI
tests cover exact text, wrong pairs, tampering, output refusal and cancellation.
These are author-run, not independent novice trials, production readiness,
publisher verification or QA-03. Participant outcomes have not yet been supplied.

The optional `scripts/test-recipient-readiness.ps1` helper takes only local paths,
the independently confirmed PUBLIC fingerprint and an explicitly nonsecret
`Zodiac readiness: <32 lowercase hex>` token. Run it in your own controlling
console. It refuses captured execution, an existing destination, the working key
as its own backup and reparse/network/device/stream paths. It creates a protected
current-user-only NTFS restore folder before copying the encrypted backup, then
runs actual pair verification/decryption for original and restored keys. It
compares output bytes locally without printing them, opening an editor or deleting
key material. Persisted encrypted/output files are explicitly disclosed. This is
setup convenience; hostile concurrent filesystem changes remain the receiver's
separately tested output boundary, not a guarantee added by this PowerShell helper.

[Native helper evidence](rec03-helper-evidence.json) records successful hidden
console trials for both synthetic RSA sizes. No production private-key read or
independent participant verdict is implied.
