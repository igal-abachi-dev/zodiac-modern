# Live delivery status

Updated 2026-10-06 (Asia/Jerusalem); evidence records UTC timestamps.
M0 and M1 development acceptance pass. The operator-confirmed production public
recipient is configured; integrated review, signing and release remain open.
Acceptance criteria remain in [the backlog](../backlog.md).

| Task                   | State              | Evidence / remaining work                                                                                                                                                                                                           |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOC-01, EN-01, EN-02   | Done               | Static scaffold, pinned tools/scripts and independent browser/Go harness.                                                                                                                                                           |
| CRY-01, CRY-02, CRY-03 | Done               | Native compatible hybrid crypto, canonical codecs, exact UTF-8/bounds, buffer cleanup and in-memory lifecycle.                                                                                                                      |
| KEY-01, KEY-02         | Done               | Strict SPKI import, fingerprints, default/custom file/paste/details/export and recipient snapshots.                                                                                                                                 |
| EN-03                  | Done               | Operator-confirmed RSA-4096 public PEM/name/fingerprint; production build, actual default browser import and canonical public export pass. Private files remain ignored and outside build inputs.                                   |
| UX-01, UX-02           | Done               | Accessible responsive visual system and exact message/encrypt/error/IME/focus flow.                                                                                                                                                 |
| UX-03.1                | Done               | Immutable result summary, complete raw ciphertext above the always-visible glyph grid, typed display/artwork action slots and working primary raw exports.                                                                          |
| UX-03                  | Done (focused export verification) | Full/selected PNG, S64M1 SVG and archival print use the mixed view; archival raw/check rows remain separate, with the requested print redaction. Full M3 gate remains to be rerun. |
| REC-01                 | Done               | Focused conditional loader approval and verified fixes; mandatory fixture/native/vendor/resource/fuzz gates retained.                                                                                                               |
| REC-02                 | Done (Windows)     | Authenticated offline command, exclusive private output and native path/mapping/reparse/race/ACL/cancel/cleanup tests. QA-03 remains separate.                                                                                      |
| KEY-03                 | Done               | Tested encrypted generation for both sizes, current vendor verification, custody/fingerprint/backup/rotation guide and secure local passphrase generator. Public-folder failure fixed and regression-tested.                        |
| REC-03                 | Review             | Guide, fresh nonsecret browser token and actual native original/restored helper trials pass for both sizes. Operator's own backup/readiness and observed first-time user trial remain pending; release verification is separate.    |
| E05, SYM-01, SYM-02    | Done (development) | 64 frozen vectors/provenance/license, bounded glyph plate/legend and raw/transcribed-row recovery pass. Similar-glyph recognition limits documented; no human error-rate measurement or SVG importer.                               |
| EXP-04                 | Done               | S64CHECK1 SVG/JSON/print integration; independent PDF raw/check/hash/Go recovery passes.                                                                                                                                            |
| EN-04.1                | Done               | One fully bundled actual Svelte sender with local help and shared crypto/codecs/raw exports; direct file:// feasibility demonstrated.                                                                                               |
| EN-04                  | In progress        | Bundled raw/printed-row recovery, SVG/PNG/JSON/print and runtime notices pass; remaining stable-browser/headed independent verification review and final delivery selection stay open.                                              |
| E06, EXP-01            | Review             | Exact raw delivery, native PNG clipboard/fallback and exports implemented. Actual Gmail-primary/Outlook-secondary draft paste pending; no connected browser session available.                                                      |
| EXP-02, EXP-03         | Done               | Trusted bounded SVG/PNG, all-page/partial print, 9 pt raw rows, cleanup and A4/Letter PDF/Go recovery pass.                                                                                                                         |
| SEC-01, SEC-03         | Done (development) | Shared exact-hash CSP, artifact/provider synchronization, fresh Vercel output, frozen installs, browser provenance/notices, Go vendor gates and accurate public guidance pass.                                                      |
| SEC-02                 | Review             | All warm browser actions with HTTP disabled, storage/log checks and reset lifecycle pass. Receiver source excludes network APIs and native output tests pass; OS-enforced network-denial receiver trial remains.                    |
| SEC-04, E07            | Review             | External hash/publisher refusal helpers and trust guidance implemented; proposed Vercel origin only. Official origin, publisher, independent channel and operational owners are undecided.                                          |
| QA-01/02/03, E08       | In progress        | Required local Chromium/Firefox matrix passes for both RSA sizes, with Go oracle, receiver-command seam, and tamper/splice regressions. WebKit optional. Published CI, human/device/email trials and independent assessment remain. |

| Milestone                   | State              | Remaining scope                                                                                                                                                       |
| --------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 — Foundation             | Done               | Reviewed loader and independent harness; retain mandatory gates.                                                                                                      |
| M1 — Compatible encryption  | Done (development) | Core acceptance and actual public recipient configuration pass. EN-04 retains its explicit M4 completion scope.                                                       |
| M2 - Usable sender/receiver | Review             | Sender/receiver and result/artifact flows pass; observed recipient readiness/usability remains.                                                                       |
| M3 - Symbols/artifacts      | Review             | E05 and E06 implementation/automated checks pass. Actual Gmail-primary/Outlook-secondary paste remains EXP-01.3.                                                      |
| M4 — Hardened candidate     | Review             | Automated hardening passes; operational trust anchors, receiver network-denial observation, offline selection and E08 human/platform/independent review gates remain. |
| M5 — Release                | Pending            | Signed receiver, reviewed sender artifact, trusted independent publisher channel and operator readiness.                                                              |

Current evidence:

- Formatting, Astro/Svelte/strict TypeScript pass with zero errors/warnings;
  37 unit tests and 62 required Chromium/Firefox browser cases pass for integrated E07/M4; 100 type-check files have zero diagnostics. Optional WebKit interop cases passed separately.
  Chromium's process
  sandbox is enabled. Browser versions are recorded in the machine evidence.
- Fixture, custom and configured production builds pass artifact/CSP checks.
  Actual production default fingerprint and canonical public PEM export match
  the separately confirmed local receiver/OpenSSL value. Invalid/missing/test
  production defaults remain covered by isolated refusal tests.
- EN-04's actual sender prototype size/hash is recorded in the current E06/E07 machine evidence. Direct file opens,
  public imports, exact UTF-8/Go decryption, raw save/manual-copy fallback,
  glyph display/raw recovery, SVG/PNG/JSON save, request-only print, reset, no runtime requests/storage/styles and matching final-block CSP hashes
  pass Chromium/Firefox and the installed stable Edge 154.0.4258.53 channel (one
  expanded file:// case passes). Bundled printed-row recovery and full runtime notices are included. Stable Chrome/Firefox installations, headed independent verification UX,
  actual email-client paste and integrated review remain unclaimed.
- E05 checks cover 512-character fixed-order previews at 8/16 columns, native
  24/16 px and monochrome print legend captures, the maximum 88,102-character
  result, exact raw recovery with explicit ASCII whitespace cleaning, independent
  S64CHECK1 vectors, early row errors and complete ordered reassembly requiring
  the full envelope digest. E06 adds generated archival print artifacts with exact row/page checks, full hash and independent Go recovery from PDF-extracted raw.
- S64M1 mixes actual raw payload characters at positions 1/5/9… with outlined
  glyphs. Sparse literal mirrors/180° rotations and CircleOff/CircleDashed/Skull nulls
  after each complete eight payload characters remain consistent across previews.
  The earlier development null/`j` swap is corrected to the user's request; Crosshair remains `j` in both views; the original S64L1 map, ciphertext,
  receiver and transcription checks remain unchanged. All affected browser,
  offline, max-size, production/CSP and visual evidence has been refreshed.
  No fills or larger reading view were added, by user choice.
- Encryption automatically shows complete raw ciphertext above the glyph grid,
  with both visible together and no view toggle. Custom public-key fields
  start collapsed, the initial message is visible at standard desktop/mobile
  sizes, and Encrypt/Clear precede readiness controls. Glyph paging returns to
  the top of the updated grid. `pnpm preview:local` serves the configured sender
  at 4324; `pnpm preview:refresh` publishes a complete snapshot with matching
  production CSP while that server runs, followed by a browser reload.
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
- REC-01 source inputs are unchanged. Its refreshed recorded evidence includes
  six OpenSSL 3.0.22/3.5.9 profiles, native/vendor/pin/offline tests, complete
  30-second pre/post-KDF fuzz runs with exact execution counts in the machine record, 136 allocations and all 7,163
  private-exponent bit mutations rejected. No new focused reviewer verdict is
  inferred from unrelated UI/guidance changes.
- E07 adds real network-disabled encryption/recovery/raw/artwork/print actions,
  empty storage/cookies/CacheStorage/IndexedDB/worker registrations and input-free
  logs/URLs/title/history, close/reopen/history/reload reset and explicit persisted
  pageshow reset. Deliberate script/connect/worker CSP probes are refused in both
  browsers. Public guidance fits 320px with no style attributes. Exact provider
  headers and Vercel copied bytes/stale-function removal pass; no deployment.
  All static JS totals about 48 KiB gzip against a 200 KiB budget, a conservative
  sum including other routes. Device latency/long-task qualification remains QA-02.
- Frozen offline pnpm installation and actual bundled dependency/license checks
  pass. The hosted tree and self-contained candidate carry the runtime notices;
  production artifact refusal tests cover private/fixture keys, network/storage,
  test decrypt, API/functions, source maps and remote integration. External HTML
  hash and receiver signature/hash/publisher refusal helpers never execute files.
  No signed Zodiac release or positive Zodiac signing check is claimed.
- The user proposes the free `https://zodiac-modern.vercel.app` origin and will
  not buy a domain. Availability/control/deployment, official origin, publisher,
  independent release channel and domain/signing/incident owners are pending in
  `config/release-trust.json`. Same-site hashes/TLS do not establish honest code.
  SEC-02's OS-enforced receiver network-denial observation is also pending;
  offline vendor tests and absence of receiver network imports are narrower evidence.

Evidence: [current E07/M4 hardening record](reviews/e07-evidence.json),
[hardening scope and trust gates](hardening.md),
[relayed comparative trust-positioning feedback](reviews/2026-10-06-trust-positioning.md),
[E08 quality evidence and gaps](reviews/e08-qa-matrix.md),
[integrated independent review packet](reviews/m4-review-packet.md),
[static host instructions](deployment.md),
[current E06/M3 export/PDF record](reviews/e06-evidence.json),
[Gmail-first sharing matrix](exports.md),
[M1 packet](reviews/m1-review-packet.md),
[M1 machine record](reviews/m1-evidence.json),
[public recipient browser evidence](reviews/production-recipient-evidence.json),
[native key setup/restoration evidence](reviews/key-setup-evidence.json),
[readiness helper evidence](reviews/rec03-helper-evidence.json),
[pending human readiness trial](reviews/rec03-readiness-trial.md),
[E05 evidence](reviews/e05-evidence.json),
[earlier mixed-view evidence](reviews/mixed-view-evidence.json),
[earlier sender layout/preview evidence](reviews/sender-layout-evidence.json),
[earlier simultaneous results evidence](reviews/simultaneous-results-evidence.json),
[glyph mapping and recognition limits](glyph-maps.md),
[EN-04 prototype scope](reviews/en04-prototype.md),
[receiver machine record](reviews/rec01-evidence.json),
[earlier receiver console receipts](reviews/rec02-console-evidence.json),
and [focused loader disposition](reviews/2026-10-03-rec01-followup.md).

The E08 addition passed six targeted RSA-3072/4096 interoperability cases in
Chromium, Firefox and optional WebKit 26.6, including independent Go-to-WebCrypto
decryption. The inactive CI template includes WebKit but remains unpublished
by user choice. Shipping CLI coverage remains open for the required Chromium
and Firefox targets. See the
[E08 QA matrix](reviews/e08-qa-matrix.md).

The relayed reviewer has no supplied identity/tool/revision. Conditional REC-01
approval and author-run verification do not constitute an integrated system
audit. The receiver remains unsigned development software. Non-Windows receiver
filesystem operations fail closed. Unix permission trials, ARM64 and Windows
OpenSSL interactive non-ASCII passphrase compatibility remain unclaimed.

The workflow stays in `workflows/foundation.yml` as a template by user choice;
GitHub Actions is not active. Local gates: `pnpm check:rec01`,
`node scripts/snapshot-rec01.mjs`, then `pnpm check:m1`; `pnpm check:m4` runs
the complete integrated gate including receiver/export/hardening evidence.

Next: resolve the undecided operational trust anchors and receiver network-denial
trial, complete EN-04's stable-browser/headed verification decision and E08's
human/platform/independent review gates. E06 actual Gmail-first/Outlook-secondary
paste and recipient readiness trials remain open. Keep the real encrypted intermediate until the
operator's final-key/pair/encrypted-backup drill succeeds; do not regenerate the
already verified key to repair a public configuration error.
