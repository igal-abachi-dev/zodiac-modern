# E08 quality evidence and remaining gates

Status: implementation in progress. This record separates automated evidence
from CI, hardware, assistive technology and independent-review acceptance.
Synthetic keys and messages only; no release or security-review verdict.

## Completed locally in this pass

The browser-to-Go interoperability test now also asks the independent Go oracle
to create envelopes and decrypts them in test-only WebCrypto code. The test
imports synthetic PKCS#8 material only inside the isolated browser test page,
checks exact UTF-8 bytes for the existing multilingual and boundary corpus, and
clears its owned byte buffers. The test-only bridge is not imported by the site
or receiver.

With Playwright's pinned WebKit 26.6 (revision 2359) installed, the targeted
`real WebCrypto` interoperability cases passed in Chromium, Firefox and WebKit
for RSA-3072 and RSA-4096: six cases total. These cases also exercise wrong-key,
envelope mutation, truncation, canonical Base64URL, size boundaries and
surrogate rejection in each browser. The existing M4 record continues to
capture the wider 62 Chromium/Firefox cases, receiver/OpenSSL/fuzz/vendor gates,
PDF-to-Go checks and Vercel output checks.

The optional Playwright WebKit project is enabled with `ZODIAC_WEBKIT=1` and is
limited to the two full interoperability cases. The inactive Windows workflow
template now installs Chromium, Firefox and WebKit and enables that project.
The template remains inactive by user choice, so this does not create published
CI evidence.

## Still required for E08 completion

- QA-01 must exercise the shipping receiver command as well as the independent
  oracle in WebKit, complete any remaining parser/key-validation regressions,
  and publish CI evidence if the workflow is activated by the operator.
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
