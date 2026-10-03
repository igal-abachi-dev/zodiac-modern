# Live delivery status

Updated 2026-10-04. Foundation evidence was recorded on 2026-10-03.
Acceptance criteria remain in [the backlog](../backlog.md).
Implementation, focused review and release are tracked separately.

| Task   | Current state | Evidence / remaining work                                                                                                                                                                                            |
| ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOC-01 | Done          | Architecture, security boundaries and acceptance criteria documented.                                                                                                                                                |
| EN-01  | Done          | Static Astro/Svelte 5 scaffold, strict TypeScript, pinned dependencies and scripts. Type checks, seven unit tests and 20 Chromium/Firefox cases pass.                                                                |
| EN-02  | Done          | Independent Go oracle and real browser WebCrypto pass both RSA sizes, exact UTF-8 boundaries and tampering. REC-01 foundation dependency satisfied.                                                                  |
| EN-03  | Review        | Public build validation and browser fingerprint equivalence pass. Custom-only import works; real independently confirmed production recipient remains unconfigured.                                                  |
| EN-04  | In progress   | Fully bundled synthetic file:// probe works in Chromium/Firefox. Complete artwork/recovery, stable platform matrix, external-hash UX and reviewed delivery decision remain pending.                                  |
| KEY-01 | Done          | Strict bounded SPKI parser, canonical DER fingerprints and actual RSA integer checks pass. Firefox metadata rounding is covered by regression tests.                                                                 |
| KEY-02 | In progress   | Local file/paste, preserved rejected replacement, details/public export, default/clear/reload and privacy/keyboard/CSP checks pass. Encryption/result snapshots and explicit new-message integration remain pending. |
| REC-01 | Done          | User-supplied conditional focused approval recorded; private-exponent, Windows navigation/cancellation and evidence-scope fixes verified. Complete OpenSSL/native/vendor/resource/fuzz gate passes.                  |
| REC-02 | Backlog       | Authenticated decryption and exclusive private output remain unimplemented. Windows local-disk/path/parent-reparse/race/ACL requirements are recorded.                                                               |
| REC-03 | Backlog       | Early verify-key exists; integrated readiness/restoration/usability depends on REC-02.                                                                                                                               |

| Milestone                  | Status      | Exit gate                                                                                               |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| M0: foundation             | Done        | EN-01, reviewed/tested REC-01 and EN-02 harness complete for recorded evidence.                         |
| M1: compatible encryption  | In progress | Complete crypto/key criteria and browser UI integration.                                                |
| M2: usable sender/receiver | Pending     | Complete sender states and authenticated CLI decryption/private output.                                 |
| M3: symbols/artifacts      | Pending     | Frozen glyphs, recovery/check codes and full SVG/PNG/print exports.                                     |
| M4: hardened candidate     | Pending     | Integrated privacy/CSP/UX, delivery decision and QA-03 system review.                                   |
| M5: release                | Pending     | Real recipient, reviewed sender artifact, signed receiver and trusted independent verification channel. |

Current evidence:

- Astro/Svelte checks: zero errors/warnings. Vitest: seven passing tests.
- Chromium/Firefox: 20 cases pass, including WebCrypto/Go,
  key validation, local selection/export/privacy and production CSP.
- Pinned Go 1.27.1: strict profile/schema/padding, cleanup/error and native tests pass.
  Every single-bit private-exponent mutation is rejected: 3,069 for the 3072-bit
  fixture and 4,094 for the 4096-bit fixture.
- OpenSSL 3.0.22/3.5.9: all six exact LF fixture hashes and public halves match.
  Native eight-byte 3.0 salts are rejected; encrypted 3.5 rewrapping preserves keys.
- Two fresh 30-second fuzz runs pass: 1,124,512 pre-KDF and 4,649 post-KDF
  executions. Profile parse/serialization: 136 allocations (limit 300).
  Corpus includes 58 pre-KDF and 39 post-KDF source seeds.
- Local unlock observations: about 87–94 ms at 600,000 iterations and 294–356 ms
  at 2,000,000. These are machine-specific observations.
- Authenticated module cache, complete regenerated vendor tree/file set/modules.txt,
  unchanged module pins and offline vendor tests/build pass.
- Native Windows arrows/Home/End/Delete are ignored; Ctrl-C cancels promptly.
  Blocked-console context cancellation restores settings in 1.0003342 seconds.
  Interactive cases are opt-in and skipped by ordinary CI.

Exact scope/results: [automated evidence](reviews/rec01-evidence.json),
[native-console evidence](reviews/rec01-console-evidence.json),
[focused approval and fix dispositions](reviews/2026-10-03-rec01-followup.md),
and [reproduction packet](reviews/rec01-review-packet.md).

The focused report was relayed by the user without a reviewer name/tool. Its
approval was conditional on the fixes; their verification here is author-run.
No independently executed post-fix run or integrated audit is claimed. Relevant
source/policy/toolchain changes reopen affected evidence and review scope.

The site's message controls remain disabled. The unsigned development receiver
supports key verification only. No production recipient, plaintext output,
final offline sender, signed release or completed integrated audit is available.

The workflow stays in workflows/foundation.yml as a template by user choice;
GitHub Actions is not active. Local gate: pnpm check:rec01. Frozen dependency
installation and the earlier 423-entry supply-chain check pass. See README for
building both custom-only and fixture artifacts before browser tests.
