# E08 quality evidence and remaining gates

Status: required local regression matrix passes. E08 remains open for
operator-controlled CI publication, human trials and independent review.
Synthetic keys and messages only; no release or security-review verdict.

## Completed locally

### 2026-10-09 predecessor follow-up

- REC-04: `go test -mod=vendor ./...` passed on the Windows workspace with the
  pinned local Go 1.27.1 toolchain and workspace-local `TMP`/`TEMP`. This run
  includes the receiver cleanup lifecycle and output/private-key hard-link
  refusal cases. It is author-run implementation evidence; it does not review
  the OS calls or establish physical erasure.
- SEC-05: the recorded 2026-10-06 M4 run already passed 62 Chromium/Firefox
  browser cases, including the new per-selection full-fingerprint comparison
  flow. A focused Chromium retest on 2026-10-09 timed out during Playwright page
  setup before any test body ran. This setup failure does not replace or extend
  the earlier passing evidence. QA-03 and manual assistive-technology review
  remain open.
- SEC-02: an OS-enforced retry could not be performed here. Querying firewall
  profiles and creating the temporary per-executable outbound block both
  returned Windows Access Denied. No rule was left behind. The receiver's
  ordinary offline tests are not OS-enforced network-denial evidence.
- EN-04.2: the usual stable Chrome/Firefox installation paths were absent in
  this Windows account. Existing Playwright Chromium/Firefox and stable Edge
  evidence remains as previously recorded; stable installed Chrome/Firefox,
  headed-user checks and independent file-boundary/hash-instruction review are
  still open.

For each RSA size, Chromium and Firefox exercise real WebCrypto encryption
against the independent Go decrypt oracle and Go encryption against test-only
WebCrypto decryption. Tests compare exact UTF-8 bytes across empty, whitespace,
multilingual, binary-like string, and 64 KiB inputs. They reject wrong keys,
each envelope-field mutation, truncation, noncanonical Base64URL, lone
surrogates, oversized text, and a wrapped key or nonce spliced from a second
valid envelope. Synthetic PKCS#8 is imported only in the isolated browser test
page, with owned buffers cleared. The test-only bridge is not imported by the
site or receiver.

The full `pnpm check:m4` run passed: frozen offline install, OpenSSL 3.0/3.5
fixtures and oracles, Go native/vendor/fuzz/resource gates, 37 unit tests, 62
Chromium/Firefox browser cases, configured production build/CSP, PDF-to-Go
recovery, dependency/license/provenance checks and fresh Vercel static output.
After adding splice checks, the focused interop rerun passed all four cases
(Chromium and Firefox, RSA-3072 and RSA-4096). Browser versions were Chromium
153.0.8010.12 and Firefox 155.0. The browser suite's receiver-command test seam
and the separately recorded hidden-controlling-terminal receipts are author-run
evidence, not independent assessment or release CI.

The native hidden-terminal receipts cover Chromium/RSA-3072 and Firefox/
RSA-4096, not every browser/size combination. The receiver-command test seam
covers the full browser/size matrix. Targeted interoperability cases also
passed with pinned Playwright WebKit 26.6 (revision 2359); WebKit is optional and
excluded from the required 62-case Chromium/Firefox gate.

## Still required for E08 completion

- QA-01's local Chromium/Firefox matrix, both RSA sizes, independent oracle,
  receiver-command seam, parser/key-validation, tampering and splice cases
  pass. QA-01.3 remains open because the Windows workflow stays an inactive
  template by operator choice; no published CI evidence is claimed.
- QA-02 still needs manual assistive-technology checks, recorded reference
  device timing/long-task measurements, actual synthetic Gmail-first and
  Outlook-secondary draft paste checks, and five novice recipient trials.
  Existing keyboard, contrast, responsive, print/PDF and automated export checks
  are author-run evidence only.
- QA-03 still needs a qualified independent reviewer, findings and severity
  records, fixes for any critical/high issues and independent rechecks. The
  prepared packet is ready to hand off; it is not an assessment.
- SEC-02's OS-enforced receiver network-denial observation and SEC-04's origin,
  publisher, independent channel and operational-owner decisions remain
  separate M4 gates.

No actual Gmail/Outlook draft was opened, no CI workflow was activated, and no
deployment or signing was performed in this work.
