# E08 remaining human and independent checks

Status: procedures prepared; trials and assessments below are **not performed**.
Use disposable synthetic messages and designated test keys. Never include a real
private key, passphrase, confidential message or signed-in account details in
screenshots, logs, recordings or review submissions.

## Assistive technology and normal browser use

Record date, OS, browser/version, assistive technology/version, tester and input
method. Test current installed Chrome and Firefox; WebKit is optional.

1. Open the verified local sender with normal settings. Navigate entirely by
   keyboard, then repeat with a screen reader. Confirm useful names, reading
   order, visible focus, error announcements and no trapped focus.
2. Type a synthetic message immediately on opening. Import each supported public
   key size by file and paste; reject a private/malformed key. Read the full
   fingerprint and compare it against the separately supplied synthetic value.
3. The permission checkbox starts checked. Uncheck it and verify encryption is
   blocked; recheck with the keyboard. Replace the key and verify permission
   returns to its documented default. This does not prove identity verification.
4. Encrypt, inspect raw and mixed views, page forward/back and check focus/scroll.
   Use clear, another-message and real navigation/back. No previous secret state
   should reappear. Test zoom, narrow viewport, high contrast and reduced motion.
5. Paste the documented 64 KiB multiline synthetic corpus in installed browsers.
   Record insertion/editing responsiveness separately from encryption timing.
   The Chrome automated native-input timeout remains an unresolved qualification
   issue; synthetic DOM insertion does not resolve actual paste behavior.
6. Save raw, SVG and PNG, open the print dialog, cancel/retry and Save as PDF.
   Inspect first/middle/final pages. Confirm literal characters, symbols and nulls
   match the mixed view and raw chunks remain complete without clipping.

Record each outcome as pass, fail, not tested or unsupported, with reproduction
steps. Author automation does not substitute for these observations.

## Mail and browser-download transport

Priority providers: Gmail, Outlook/Microsoft 365, Proton Mail and iCloud Mail.
Use unsent synthetic drafts unless a separate send/receive trial is explicitly
authorized. Record provider UI, browser/version, date and account type, without
account identifiers. Do not infer compatibility from MIME support alone.

For each provider, try exact raw-text paste, the downloaded `.txt` attachment and
optional PNG clipboard paste. Record altered wrapping/whitespace, truncation,
attachment naming/type, image conversion and unsupported behavior. A local paste
target or accepted clipboard write is not evidence of a provider result.
Compare any recovered/downloaded raw file byte-for-byte and by whole-envelope
SHA-256, then decrypt with the matching synthetic receiver key. Unsent drafts do
not establish delivered-message or recipient-side fidelity. SVG display is not
universally supported, and v1 receiver recovery requires raw ciphertext.

Separately test manual `.txt` upload/browser download through Proton Drive,
Google Drive, Wormhole and MEGA if those routes are included in release claims.
Record link access/expiry and exact downloaded bytes. These are transport tests,
not provider-security endorsements or application integrations.

## Recipient readiness and reference devices

Follow [REC-03 trial instructions](rec03-readiness-trial.md). The operator performs
their own encrypted-backup restore drill. Five representative novice recipients
trial the Windows guide; the QA-02 target is at least four successful synthetic
decryptions with one copied command after setup, without assistance. Record
failures and corrective changes; never observe or capture real passphrases.

On designated reference laptop/phone hardware, record CPU/RAM/OS/browser, input
size and line count, cold/warm load, encryption-to-first-result, paging, export
and long-task samples over repeated trials. Unsupported Long Task API is not
zero long tasks. Separate automation overhead and native input delay. Compare
against the plan's budgets and document misses for review rather than removing
Unicode support or silently reducing the supported input limit.

## Independent assessment and operational gates

Use the [integrated review packet](m4-review-packet.md) and exact tested source/
artifact hashes. Record reviewer, revision/artifacts, scope, assumptions,
platforms, severity, reproduction, remediation task and independent recheck.
Every critical/high finding must be fixed and independently rechecked. Preserve
an explicit verdict and limitations; an empty findings table is not approval.

The administrator performs the existing receiver network-denial procedure and
records the OS rule/effective-denial evidence plus successful offline decryption.
Application request interception and non-administrator shell execution do not
establish an OS firewall boundary.

Release owner decisions remain separate: official origin, expected publisher,
independently trusted verification channel, reviewed final hashes, reporting
route, triage owner, supported versions and final offline sender delivery. The
single public repository choice does not supply these missing trust anchors.
