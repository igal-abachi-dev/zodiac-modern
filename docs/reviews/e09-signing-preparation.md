# E09 self-signing preparation

Recorded 2026-10-11. This is author preparation, not independent review or a
signed release. Current candidates remain unsigned.

## Owner-run provisioning candidate

`scripts/New-ZodiacSigningCertificate.ps1` prepares the selected subject
`CN=Zodiac Modern` using RSA-3072/SHA-256, code-signing usage, a one-year lifetime,
the Windows current-user personal store and Microsoft Software Key Storage
Provider. It requests a non-exportable key with `ProtectHigh`, requiring native
owner interaction on the selected trusted signing machine. It exports only a
public DER certificate and a nonsecret receipt with a full SHA-256 certificate
pin. The store-selector thumbprint is not the SHA-256 identity pin.

```powershell
# Run a dry run first; the parent directory must already exist.
& .\scripts\New-ZodiacSigningCertificate.ps1 -PublicOutputDirectory .\artifacts\signing-public -WhatIf
# On the owner's trusted signing PC, after choosing signing-key custody:
& .\scripts\New-ZodiacSigningCertificate.ps1 -PublicOutputDirectory .\artifacts\signing-public
```

The script refuses existing output directories and reparse-point parents. It
does not install any trusted root, export a private key/PFX, sign executables,
modify release configuration, timestamp, publish or claim release readiness.
Dry-run checks pass; actual provisioning/high-protection/signing behavior has
not been tested. Native owner prompts were not completed in the agent session.

A software non-exportable key is not a hardware token, protection against a
compromised account, or a recoverable private-key backup. Record who owns the
key and the signing machine; loss requires a replacement signing identity and
independently verified new pin. Define rotation/revocation and certificate
expiry behavior before distributing artifacts. Test native protection prompts
and Windows permissions on the selected machine. Prefer hardware-backed signing
where appropriate; it needs separate provider/hardware validation.

## Verification boundary and remaining design

The existing `verify-receiver.ps1` still requires Windows `Valid` Authenticode
status, the exact subject and expected artifact SHA-256. A self-signed
certificate has no automatic Windows trust; merely matching its subject or
certificate hash does not verify an executable's cryptographic signature.

Before supporting self-signed recipient verification, implement and independently
review an explicit isolated pinned-certificate verification path using a vetted
Windows signature-verification API. It must verify the actual PE signature and
digest, bind the exact independently obtained certificate pin and publisher,
enforce intended usage/validity and reject malformed, altered, unsigned or
wrong-signer artifacts. Define timestamp/expiry/revocation policy explicitly.
Do not reinterpret `NotTrusted` as proof of integrity or install unverified roots.
Keep the current strict helper unchanged and do not advise OS-warning bypass.

Only after that verification path and review pass should packaging support
signed artifacts: build, sign native files, verify signatures, hash the final
signed bytes, generate the manifest, archive, then hash/read back the final ZIP.
Do not modify a finalized unsigned bundle in place or retain its old checksums
after signing. Unsigned candidate packaging remains available for development.

Microsoft references: [certificate provisioning](https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate),
[Authenticode signing](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/set-authenticodesignature),
[signature verification](https://learn.microsoft.com/en-us/windows/win32/seccrypto/using-signtool-to-verify-a-file-signature).
