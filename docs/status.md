# Live delivery status

Updated 2026-10-03. This records implementation and verification separately from
independent review and release. Acceptance criteria remain in [the backlog](../backlog.md).

| Task   | Current state | Evidence / remaining work                                                                                                                                                                                                                                                                                        |
| ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOC-01 | Done          | Architecture, security boundaries and acceptance criteria documented.                                                                                                                                                                                                                                            |
| EN-01  | Done          | Static Astro/Svelte 5 scaffold, strict TypeScript, pinned dependencies and working scripts. Type checks, seven unit tests and the 12-case Chromium/Firefox suite pass.                                                                                                                                           |
| EN-02  | Review        | Independent Go envelope oracle and real Chromium/Firefox WebCrypto interoperability pass for both RSA sizes, exact UTF-8 boundaries and field tampering. Completion still depends on REC-01's foundation gate.                                                                                                   |
| EN-03  | Review        | Public recipient validator, generated public data, separate fixture/custom modes and fail-closed tests implemented. KEY-01 integration and a real independently confirmed public recipient remain open.                                                                                                          |
| EN-04  | In progress   | Fully bundled synthetic file:// probe opens and encrypts in Chromium and Firefox. Complete artwork/recovery flows, stable Windows browser matrix, external-hash usability and focused review remain open. No final sender delivery choice yet.                                                                   |
| REC-01 | Review        | Fixed-profile loader, hidden prompt, fixture/oracle tests, negative cases, bounded fuzzing and vendor verification implemented. User-supplied independent feedback received. Expanded seed corpus and repeatable local gates pass; post-fix independent review remains open. CI stays a template by user choice. |
| REC-02 | Backlog       | Authenticated decryption and exclusive private output are not implemented. Windows local-disk/path/parent-reparse/race/ACL requirements are recorded.                                                                                                                                                            |
| REC-03 | Backlog       | Early verify-key command exists; integrated readiness, restoration and recipient usability still depend on REC-02.                                                                                                                                                                                               |

| Milestone                  | Status                                       | Exit gate                                                                                               |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| M0: foundation             | Open; implementation substantially present   | REC-01 mandatory evidence and focused review, then EN-02 completion.                                    |
| M1: compatible encryption  | Open; library and harness prototypes present | Complete crypto/key acceptance criteria and browser UI integration.                                     |
| M2: usable sender/receiver | Pending                                      | Complete sender flow and authenticated CLI decryption with safe private output.                         |
| M3: symbols/artifacts      | Pending                                      | Frozen glyphs, recovery/check codes, full SVG/PNG/print exports.                                        |
| M4: hardened candidate     | Pending                                      | Integrated privacy/CSP/UX checks, delivery decision and independent system review.                      |
| M5: release                | Pending                                      | Real recipient, reviewed sender artifact, signed receiver and trusted independent verification channel. |

Latest completed checks before this status update:

- Astro and Svelte checks: zero errors or warnings; Vitest: seven passing tests.
- Pinned Go 1.27.1 receiver tests: pass, including public-path validation before
  prompting, password cleanup, profile boundaries, strict nested schemas and padding.
- Native unlock latency on this Windows machine: about 87–135 ms at 600,000
  iterations, and 291–372 ms at 2,000,000 in the latest run. These are local
  observations, not minimum-platform guarantees.
- OpenSSL 3.0.22/3.5.9 differential oracle: all six recorded fixture public halves
  match. Native 3.0 eight-byte salts are intentionally rejected; encrypted 3.5
  rewrapping preserves the public half.
- Earlier 30-second fuzz runs: pre-KDF 297,546 executions; post-KDF 194,262;
  neither reported a failure. Expanded corpus now has 58 pre-KDF and 39 post-KDF seeds; repeatable local gate implemented. See the REC-01 review packet for current exact hashes/results.
- Module authentication and a complete regenerated vendor file/content comparison
  passed, followed by offline vendor tests/build. Vendor is intentionally tracked.
- Real browser interoperability: all four RSA/browser cases passed in Chromium
  and Firefox. The full suite passed all 12 cases in 12.9 seconds with temporary
  browser profiles allowed outside the restricted sandbox.

The site's message controls remain disabled scaffolding. The unsigned development
receiver supports key verification only. There is no production release, completed
audit, enabled plaintext output or supported final offline sender artifact.

The reproducible gate is now `pnpm check:rec01`; oracle provisioning is
`node scripts/setup-openssl-ci.mjs`. The workflow lives in
`workflows/foundation.yml` as a template, as explicitly requested by the user.
The [focused review packet](reviews/rec01-review-packet.md) records scope, tools,
commands, terminal evidence and remaining review requirements. Frozen lockfile
installation and pnpm's 423-entry supply-chain policy check pass.

Latest exact gate snapshot: [rec01-evidence.json](reviews/rec01-evidence.json).
Both final 30-second fuzz runs pass: 1,356,918 pre-KDF and 4,832 post-KDF
executions; profile parse/serialization measures 136 allocations (limit 300).
The custom-only static build passes artifact checks for 18 files across eight
routes. No production key or signed release has been configured.

A real Windows blocked-console context cancellation test passes in 1.0003955
seconds and verifies restoration of terminal settings. Interactive testing is
opt-in and is explicitly skipped by ordinary CI runs. Hosted GitHub Actions
remains disabled by user choice; its regression workflow is kept as a template.
