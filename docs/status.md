# Live delivery status

Updated 2026-10-05 (Asia/Jerusalem); evidence records UTC timestamps.
M0 and M1 development acceptance pass. The operator-confirmed production public
recipient is configured; integrated review, signing and release remain open.
Acceptance criteria remain in [the backlog](../backlog.md).

| Task                   | State              | Evidence / remaining work                                                                                                                                                                                                        |
| ---------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOC-01, EN-01, EN-02   | Done               | Static scaffold, pinned tools/scripts and independent browser/Go harness.                                                                                                                                                        |
| CRY-01, CRY-02, CRY-03 | Done               | Native compatible hybrid crypto, canonical codecs, exact UTF-8/bounds, buffer cleanup and in-memory lifecycle.                                                                                                                   |
| KEY-01, KEY-02         | Done               | Strict SPKI import, fingerprints, default/custom file/paste/details/export and recipient snapshots.                                                                                                                              |
| EN-03                  | Done               | Operator-confirmed RSA-4096 public PEM/name/fingerprint; production build, actual default browser import and canonical public export pass. Private files remain ignored and outside build inputs.                                |
| UX-01, UX-02           | Done               | Accessible responsive visual system and exact message/encrypt/error/IME/focus flow.                                                                                                                                              |
| UX-03.1                | Done               | Immutable result summary, native display/raw view controls, typed display/artwork action slots and working primary raw exports.                                                                                                  |
| UX-03                  | In progress        | Repeat/reset/navigation and actual frozen glyph display pass. Optional SVG/PNG/print actions remain E06.                                                                                                                         |
| REC-01                 | Done               | Focused conditional loader approval and verified fixes; mandatory fixture/native/vendor/resource/fuzz gates retained.                                                                                                            |
| REC-02                 | Done (Windows)     | Authenticated offline command, exclusive private output and native path/mapping/reparse/race/ACL/cancel/cleanup tests. QA-03 remains separate.                                                                                   |
| KEY-03                 | Done               | Tested encrypted generation for both sizes, current vendor verification, custody/fingerprint/backup/rotation guide and secure local passphrase generator. Public-folder failure fixed and regression-tested.                     |
| REC-03                 | Review             | Guide, fresh nonsecret browser token and actual native original/restored helper trials pass for both sizes. Operator's own backup/readiness and observed first-time user trial remain pending; release verification is separate. |
| E05, SYM-01, SYM-02    | Done (development) | 64 frozen vectors/provenance/license, bounded glyph plate/legend and raw/transcribed-row recovery pass. Similar-glyph recognition limits documented; no human error-rate measurement or SVG importer.                            |
| EXP-04                 | In progress        | Exact S64CHECK1 helpers, external typed metadata, early row/page errors and final assembly checks pass. Generated artwork/print metadata and labels remain E06.                                                                  |
| EN-04.1                | Done               | One fully bundled actual Svelte sender with local help and shared crypto/codecs/raw exports; direct file:// feasibility demonstrated.                                                                                            |
| EN-04                  | In progress        | Glyph display and bundled raw recovery pass. SVG/PNG/print, remaining bundled printed-row/platform matrix, independent boundary/hash-verification UX review and final delivery choice remain in EN-04.2/.3.                      |

| Milestone                   | State              | Remaining scope                                                                                                           |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| M0 — Foundation             | Done               | Reviewed loader and independent harness; retain mandatory gates.                                                          |
| M1 — Compatible encryption  | Done (development) | Core acceptance and actual public recipient configuration pass. EN-04 retains its explicit M4 completion scope.           |
| M2 — Usable sender/receiver | In progress        | Core sender/receiver and key guide work. Recipient usability/operational readiness and UX-03 artwork completion remain.   |
| M3 — Symbols/artifacts      | In progress        | E05 frozen glyphs and raw/transcription recovery complete; E06 SVG/PNG/print exports and EXP-04 print integration remain. |
| M4 — Hardened candidate     | Pending            | Full offline delivery decision, integrated privacy/export/UX and independent QA-03.                                       |
| M5 — Release                | Pending            | Signed receiver, reviewed sender artifact, trusted independent publisher channel and operator readiness.                  |

Current evidence:

- Formatting, Astro/Svelte/strict TypeScript pass with zero errors/warnings;
  29 unit tests and 42 Chromium/Firefox browser cases pass for the S64M1 follow-up.
  Chromium's process
  sandbox is enabled. Browser versions are recorded in the machine evidence.
- Fixture, custom and configured production builds pass artifact/CSP checks.
  Actual production default fingerprint and canonical public PEM export match
  the separately confirmed local receiver/OpenSSL value. Invalid/missing/test
  production defaults remain covered by isolated refusal tests.
- EN-04's actual sender prototype is 144,995 bytes (about 142 KiB). Direct file opens,
  public imports, exact UTF-8/Go decryption, raw save/manual-copy fallback,
  glyph display/raw recovery, reset, no runtime requests/storage/styles and matching final-block CSP hashes
  pass Chromium/Firefox and the installed stable Edge 154.0.4258.53 channel (one
  expanded file:// case passes). Stable Chrome/Firefox installations, bundled
  printed-row trials and full SVG/PNG/print review remain unclaimed.
- E05 checks cover 512-character fixed-order previews at 8/16 columns, native
  24/16 px and monochrome print legend captures, the maximum 88,102-character
  result, exact raw recovery with explicit ASCII whitespace cleaning, independent
  S64CHECK1 vectors, early row errors and complete ordered reassembly requiring
  the full envelope digest. Generated print artifacts are outside these checks.
- S64M1 mixes actual raw payload characters at positions 1/5/9… with outlined
  glyphs. Sparse literal mirrors/180° rotations and CircleOff/Crosshair/Skull nulls
  after each complete eight payload characters remain consistent across previews.
  CircleDashed is the mixed-view `j` glyph; the original S64L1 map, ciphertext,
  receiver and transcription checks remain unchanged. All affected browser,
  offline, max-size, production/CSP and visual evidence has been refreshed.
  No fills or larger reading view were added, by user choice.
- REC-03's optional one-command helper passes actual hidden-console original/
  restored key verification and exact nonsecret token decryption for both sizes.
  Existing destinations are refused before a passphrase prompt. Participant
  production backup and first-time user outcomes have not yet been supplied.
- Both real hidden-console OpenSSL key setup trials (3072/4096) and separate
  encrypted-backup verification/decryption trials pass with exact synthetic
  output bytes. No password/private/plaintext input is put in argv, environment
  or piped password input. The random generator uses native GetInt32 where
  available or unbiased byte rejection on Windows PowerShell 5.1; redirected
  generation is refused and mapping/native-generator tests pass.
- REC-01 source inputs are unchanged. Its latest recorded evidence includes
  six OpenSSL 3.0.22/3.5.9 profiles, native/vendor/pin/offline tests, 709,933
  pre-KDF and 2,472 post-KDF fuzz executions, 136 allocations and all 7,163
  private-exponent bit mutations rejected. No new focused reviewer verdict is
  inferred from unrelated UI/guidance changes.

Evidence: [M1 packet](reviews/m1-review-packet.md),
[M1 machine record](reviews/m1-evidence.json),
[public recipient browser evidence](reviews/production-recipient-evidence.json),
[native key setup/restoration evidence](reviews/key-setup-evidence.json),
[readiness helper evidence](reviews/rec03-helper-evidence.json),
[pending human readiness trial](reviews/rec03-readiness-trial.md),
[E05 evidence](reviews/e05-evidence.json),
[current mixed-view evidence](reviews/mixed-view-evidence.json),
[glyph mapping and recognition limits](glyph-maps.md),
[EN-04 prototype scope](reviews/en04-prototype.md),
[receiver machine record](reviews/rec01-evidence.json),
[earlier receiver console receipts](reviews/rec02-console-evidence.json),
and [focused loader disposition](reviews/2026-10-03-rec01-followup.md).

The relayed reviewer has no supplied identity/tool/revision. Conditional REC-01
approval and author-run verification do not constitute an integrated system
audit. The receiver remains unsigned development software. Non-Windows receiver
filesystem operations fail closed. Unix permission trials, ARM64 and Windows
OpenSSL interactive non-ASCII passphrase compatibility remain unclaimed.

The workflow stays in `workflows/foundation.yml` as a template by user choice;
GitHub Actions is not active. Local gates: `pnpm check:rec01`,
`node scripts/snapshot-rec01.mjs`, then `pnpm check:m1`.

Next: record recipient usability/readiness outcomes; E06 artwork/print exports
follow when authorized. Complete UX-03 and EN-04 full delivery review, QA-03
and release gates afterward. Keep the real encrypted intermediate until the
operator's final-key/pair/encrypted-backup drill succeeds; do not regenerate the
already verified key to repair a public configuration error.
