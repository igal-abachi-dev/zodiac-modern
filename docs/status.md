# Live delivery status

Updated 2026-10-04 (Asia/Jerusalem); evidence records UTC timestamps.
M0 is complete and M1 development acceptance passes. The latest receiver
path-mapping refinement is undergoing a refreshed gate before this turn closes.
Acceptance criteria remain in [the backlog](../backlog.md).
Implementation, focused review, integrated review and release are distinct.

| Task | State | Evidence / remaining work |
| --- | --- | --- |
| DOC-01, EN-01, EN-02 | Done | Static scaffold, pinned scripts/toolchains and independent browser/Go harness. |
| CRY-01 | Done | Native hybrid profile, immutable output, fresh key/nonce, nonextractable AES and owned-buffer cleanup; independent Go and command interoperability/tampering. |
| CRY-02 | Done | Pure canonical Base64URL, modulus-derived split/serialize, exact offsets and min/max/empty-library lengths. |
| CRY-03 | Done | Original UTF-16 validation, exact UTF-8 count/limits, duplicate/retry/reset/digest races and immutable recipient snapshot. |
| KEY-01, KEY-02 | Done | Strict public import/fingerprints, local default/custom file/paste/details/export; busy/result locks and explicit restart/default reset. |
| EN-03 | Review | Build validation and browser equivalence pass. Real independently confirmed production identity/public PEM/fingerprint remains a launch gate. |
| UX-01, UX-02 | Done | Light-first tokens, dark/reduced-motion/print variants, measured contrast and 320px/200% text reflow; exact composer, IME/keyboard/capabilities/errors/focus. |
| UX-03 | In progress | Raw result/profile/checksum/copy/download, another-message/clear/reload/navigation pass. Full display/artwork action group depends on M3. |
| REC-01 | Done | Focused conditional loader approval and verified fixes; refreshed exact OpenSSL/native/vendor/resource/fuzz evidence. |
| REC-02 | Done (Windows) | Authenticated offline command and private owner-only exclusive output; native path/mapping/reparse/race/ACL/cancel/cleanup tests. Actual browser/hidden-console runs pass. New integration still needs QA-03. |
| KEY-03, REC-03 | Backlog | Complete tested key creation/custody/rotation, backup restoration and recipient readiness/usability guidance. ASCII/random-passphrase guidance added. |
| EN-04 | In progress | Rebuilt fully bundled synthetic file:// probe passes Chromium/Firefox. Full sender/export/recovery/platform/verification UX and reviewed delivery choice remain open. |

| Milestone | Status | Exit scope / remaining work |
| --- | --- | --- |
| M0 — Foundation | Done | Reviewed loader, real fixture matrix and independent harness; mandatory gates retained. |
| M1 — Compatible encryption | Done (development) | Crypto, strict key/fingerprint and default/custom paths pass with synthetic fixtures. Real production recipient remains a release gate. |
| M2 — Usable sender/receiver | In progress | Core raw sender and Windows decrypt/private-output flow work. KEY-03/REC-03 guidance/readiness and UX-03 cross-milestone completion remain. |
| M3 — Symbols/artifacts | Pending | Frozen glyphs, raw/transcription recovery/checks and full SVG/PNG/print. |
| M4 — Hardened candidate | Pending | Full offline delivery decision, integrated privacy/export/UX and independent QA-03. |
| M5 — Release | Pending | Real recipient, signed receiver, reviewed sender artifact and trusted independent publisher channel. |

Current automated evidence:

- Formatting, Astro/Svelte/strict TypeScript: zero errors/warnings; 14 unit tests.
- 30 real Chromium/Firefox cases pass under production CSP, including both RSA
  sizes, same-size wrong keys, all field tampering, exact UTF-8 boundaries,
  operation/input/key/export/navigation/privacy and visual checks.
- Separate fixture/custom static builds and artifact checks pass. Unconfigured
  production builds fail intentionally. The offline probe remains synthetic.
- Go 1.27.1 native suite and all six OpenSSL 3.0.22/3.5.9 LF fixture/oracle checks
  pass. Native 3.0 eight-byte salts reject; 3.5 rewrap preserves public keys.
- Latest recorded 30-second fuzz runs: 1,842,602 pre-KDF and 15,840 post-KDF
  executions; refreshed totals are in the exact receiver snapshot. Resource
  check: 136 allocations (limit 300). All 7,163 private-exponent bit mutations
  reject. Full vendor tree/file set/modules.txt, module hashes/pins and offline
  vendor tests/build pass.
- Native Windows output tests exercise permissive inheritance, protected
  current-user ACLs, UNC/device/stream/reserved aliases, final/parent junctions,
  held-parent rename and actual reparse mutation, mapped local aliases/hardlinks,
  bounds, exclusive overwrite, authentication-before-create and partial cleanup.
- Actual unsigned executable runs with genuine hidden controlling-console
  prompts decrypt synthetic RSA-3072 Chromium and RSA-4096 Firefox ciphertexts
  byte-exact. No plaintext is printed. Owner-only output correctly denies a
  restricted sandbox token; comparison uses the normal native user context.

Evidence: [M1 packet](reviews/m1-review-packet.md),
[M1 machine record](reviews/m1-evidence.json),
[receiver machine record](reviews/rec01-evidence.json),
[actual receiver console receipts](reviews/rec02-console-evidence.json),
[earlier terminal evidence](reviews/rec01-console-evidence.json),
[focused loader disposition](reviews/2026-10-03-rec01-followup.md),
and [relayed repository feedback](reviews/2026-10-04-repository-feedback.md).

The relayed reviewer has no supplied identity/tool/revision. Their conditional
REC-01 approval and author-run fix verification do not constitute an integrated
review of the new output code. QA-03, signing, independent publisher trust,
full offline sender and production recipient remain open. Non-Windows receiver
filesystem operations fail closed; Windows OpenSSL interactive non-ASCII
passphrase compatibility remains unclaimed. Use synthetic data only.

The workflow stays in `workflows/foundation.yml` as a template by user choice;
GitHub Actions is not active. Local gates: `pnpm check:rec01`,
`node scripts/snapshot-rec01.mjs`, then `pnpm check:m1`.

Next order: KEY-03 → REC-03, then SYM-01/SYM-02 and raw recovery/export checks,
complete artwork/UX-03, EN-04 full delivery choice and QA-03, then release gates.
