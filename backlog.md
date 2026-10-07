# Zodiac Modern — delivery backlog

Baseline: 2026-10-03. Specification: [plan.md](plan.md). Contributor rules: [AGENTS.md](AGENTS.md). Foundation code and tests now exist; task/milestone evidence is maintained in [docs/status.md](docs/status.md). No completed audit or deployment is claimed.

## 1. Priorities, statuses, and working rules

| Priority | Meaning |
| --- | --- |
| P0 | Security/correctness foundation or release blocker; resolve before public use |
| P1 | Required product behavior/quality; included in the complete first release |
| P2 | Later improvement, explicitly outside the first release unless re-scoped |

P1 does not mean optional. The user's first release includes default/custom recipients, local browser encryption, a downloadable offline Go decrypt CLI with encrypted key support, symbols, copying, raw recovery, print/image exports, Vercel hosting, pnpm local use, and a smooth repeat-message flow. All required P0/P1 acceptance criteria must pass before M5.

Workflow: **Backlog → Ready → In progress → Review → Verification → Done**. **Blocked** is a temporary status from any active stage; record the blocking dependency, owner, next action, and return stage. **Deferred** applies only to explicitly excluded later work. Failed verification returns to In progress; security review findings reopen affected items. Epic status rolls up from children: Done only when every required child is Done; otherwise show the current active stage or Backlog/Ready.

Definition of Ready: clear scope/AC, dependencies satisfied or usable fixtures documented, chosen implementation approach consistent with the plan, and an independent verification method. Definition of Done: all AC satisfied, relevant tests and production-build checks pass, evidence recorded, no sensitive artifacts introduced, and docs/statuses updated. An unavailable production recipient does not block fixture-based engineering; it blocks production configuration and release.

Use one implementation story at a time per contributor. Do not substitute a passing mock for real WebCrypto/Go interoperability. Do not mark a cryptographic review complete based on automated tests. Subtasks below are Backlog unless marked otherwise; an unchecked box means not completed, not failure. Story acceptance criteria are mandatory even if a subtask is reorganized.

When changing status, append evidence using: `ID | date | status | source commit/files | checks/evidence | reviewer | remaining constraint`. No estimates are promises; milestones express ordering rather than dates.

## 2. Epics and milestones

| Epic | Type | Priority | Status | Milestone | Outcome |
| --- | --- | --- | --- | --- | --- |
| E00 | Planning | P0 | Done | M0 | Source review and planning documents |
| E01 | Enablers | P0 | In progress | M0 | Scaffold verification, harness/build pipeline review, partial offline spike |
| E02 | Crypto | P0 | Done | M1 | Exact compatible browser encryption and strict codecs |
| E03 | Key management | P0 | Done | M1 | Safe default/custom public recipients and tested offline key guide |
| E04 | Workspace | P1 | In progress | M2 | Accessible edit/encrypt/result/reset flow |
| E05 | Symbols/recovery | P1 | Done | M3 | Mixed S64M1 view verified; frozen mapping/raw recovery complete; SVG exports remain E06 |
| E06 | Exports/sharing | P1 | Review | M3 | Copy/download/image/print implemented and automated checks pass; Gmail-primary/Outlook-secondary paste pending |
| E07 | Hardening | P0 | Review | M4 | Automated CSP/privacy/artifact/dependency gates pass; operational trust anchors and receiver network-denial trial pending |
| E08 | Verification/review | P0 | In progress | M4 | Chromium/Firefox are required targets; bidirectional Go/WebCrypto cases pass for both RSA sizes. WebKit is optional; human/platform trials and independent review remain |
| E09 | Release | P0 | Backlog | M5 | Real recipient, verified host/offline bundle, custody and rollback |
| E10 | Later options | P2 | Deferred | Later | Explicitly separate future decisions |
| E11 | Offline recipient | P0 | In progress | M0/M2/M4 | REC-01/REC-02 Done for Windows; readiness and release review remain |

Critical-path start: `DOC-01 → (EN-01 alongside REC-01) → EN-02 → E02/E03 → E04/REC-02 → E05/E06 → E07/E08 → E09`. REC-01 starts in M0 without frontend/public-key importer dependencies; its real OpenSSL 3.0/3.5 prototype, fuzz/resource/vendor evidence and focused independent review are foundation gates, not deferred M2/release tasks. E07 policy starts during scaffold; E08 tests grow with each story and QA-03 retains the later system review. EN-04 begins file:// feasibility early and completes its full-flow delivery decision before release/review scope is finalized; do not commit to a native sender launcher before that decision. E02/E03/E11 use synthetic fixtures. E09 requires real public configuration, receiver decryption, review, independently verified sender bytes, signed receiver/any selected native launcher and a trusted verification channel.

## 3. Completed planning

### DOC-01 — establish the implementation baseline

Type: enabler · Epic: E00 · Priority: P0 · Status: Done · Dependencies: none.

Acceptance criteria:

- [x] Browser-only user requirements supersede historical backend proposals.
- [x] Go envelope, key support policy, symbol-copy tradeoffs, threat model, architecture, UX, tests, and release gates are documented in `plan.md`.
- [x] Epics/stories/subtasks/enablers, priorities, status flow, AC, dependencies, and evidence expectations exist in this backlog.
- [x] Repository-level `AGENTS.md` gives build contributors concrete security and framework conventions.

Completed subtasks: `DOC-01.1` review source context/Go/reference ZIP/flow diagrams; `DOC-01.2` check primary crypto/framework/clipboard/email/key-format/hosting documentation; `DOC-01.3` write and cross-check planning documents and incorporate feedback and confirmed receiver decisions. Evidence: the three root planning/instruction files; documentation checks cover local links, fences, story metadata, dependencies and five envelope size examples. No application test or security-review status is inferred from this item.

## 4. E01 — implementation enablers

### EN-01 — create the minimal static Astro/Svelte 5 project

Type: enabler · Priority: P0 · Status: Done · Milestone: M0 · Dependencies: DOC-01.

Acceptance criteria:

- Static Astro output, compatible Astro Svelte integration, Svelte 5 runes, strict TypeScript, formatter, and pinned package manager/lockfile are present; supported engines are verified against official package requirements.
- The planned directories/routes exist; the browser workspace uses `client:only="svelte"` with a usable static loading/no-JS explanation. No Sanity/React/API/SSR adapter enters dependencies or output.
- `pnpm check`, `pnpm test`, and `pnpm build` have real documented scripts; fixture/test builds are explicit and separate from production configuration.
- The original context/Go reference/ZIP remain preserved; local private key files and test artifacts are excluded from release output.

Subtasks:

- [x] EN-01.1 — verify and pin Node/pnpm/framework versions; initialize minimal packages and lockfile.
- [x] EN-01.2 — scaffold Astro layout/routes, Svelte island, CSS tokens, and static explanatory content using the standard create-astro and astro add svelte CLIs, then extend the structure.
- [x] EN-01.3 — add formatter/type/test/build scripts, `.gitignore`, and a test-only recipient configuration path.

### EN-02 — establish independent crypto fixtures and a Go test harness

Type: enabler · Priority: P0 · Status: Done · Milestone: M0 · Dependencies: EN-01, REC-01.

Acceptance criteria:

- Clearly labeled nonproduction RSA-3072 and RSA-4096 fixture pairs and synthetic text/byte cases exist outside the public tree.
- Consume REC-01's recorded OpenSSL 3.0/3.5 fixture/profile evidence after its foundation gate passes; do not make the loader depend on this harness. The envelope oracle remains independently implemented and exercised.
- Offline Go harness independently parses/decrypts the exact format and can generate test envelopes. It enforces 32-byte recovered AES material, authentication before output, and the documented canonical decoder wrapper.
- Real browser WebCrypto test setup exists; RNG/native crypto is not replaced by mocks in compatibility checks.
- Fixture fingerprints/private keys/test-only decrypt code cannot enter release `dist`; scripts fail on leakage. Harness code is not an online service or an audited receiver claim.

Subtasks:

- [x] EN-02.1 — create fixture key pairs, profile serialization cases, and multilingual/boundary corpus.
- [x] EN-02.2 — implement an isolated Go OAEP/GCM harness using the reference layout plus explicit parsing checks.
- [x] EN-02.3 — wire Playwright/interop script to exchange test-only envelopes with the harness; record tool versions. Both RSA sizes pass real Chromium/Firefox checks and REC-01's focused gate is satisfied; QA-03 integrated review remains separate.

### EN-03 — validate and generate public recipient build data

Type: enabler · Priority: P0 · Status: Done · Milestone: M1 · Dependencies: EN-01, KEY-01.

Acceptance criteria:

- `config/recipient.json` references a public SPKI PEM, recipient name, and independently expected fingerprint. The build generates only public browser data and serves the same PEM as a static download.
- Production builds fail on missing/invalid/unsupported PEM, missing identity, fingerprint mismatch, or known fixture key; there is no throwaway generation path.
- Development without a default shows custom-key import; fixture builds use an explicit test configuration and separate output location.
- No encryption action fetches the PEM at runtime; the default browser fingerprint equals build validation output.

Subtasks:

- [x] EN-03.1 — implement public config schema and build-time key/fingerprint validator.
- [x] EN-03.2 — generate `src/generated/default-recipient.ts` and public PEM consistency checks.
- [x] EN-03.3 — fail-closed production/fixture/development cases pass. The operator-confirmed RSA-4096 public configuration now passes production build and real-browser default/fingerprint/public export checks; signing and integrated release review remain separate.

### EN-04 — spike self-contained file:// sender before selecting a launcher

Type: enabler · Priority: P0 · Status: In progress · Milestone: M1/M4 · Dependencies: EN-01, CRY-01, EXP-01, SYM-02, SEC-01.

Acceptance criteria:

- Early feasibility prototype and final candidate share existing sender/WebCrypto/codecs/export logic; inline all compiled JS/CSS/glyphs/public configuration/offline help in one HTML file. No external ES imports/dynamic chunks/eval/fonts/fetch/adjacent-file or hosted-origin dependency. A normal Astro index.html with asset links is not claimed to be self-contained.
- Test direct fresh file:// opens in stable Windows Edge/Chrome/Firefox under default security settings, paths with spaces/non-ASCII, recorded versions and blocked external networking. Both RSA sizes/default/custom public imports, exact text/reset, raw download/copy or manual fallback, full SVG, complete/page PNG copy or save fallback, print/raw recovery pass; compare independent Go decryption and exact exported order/count. Optional Safari/mobile support requires separate real-platform evidence.
- Hash-based CSP meta precedes executable content, forbids connect/worker/object/form/base paths and unsafe-inline/eval, and matches actual inline blocks. Audit runtime/network/storage and absence of imported SVG/private-key code. Document meta-CSP/header limitations; independent review accepts the chosen local boundary without weakening hosted/localhost policies.
- User verifies the full HTML hash outside the file, before opening, against an independently trusted value. Same-site hashes/self-verified badges are insufficient. Test altered HTML and usable Windows verification instructions. A verified file sender does not require native sender signing; receiver signing remains required.
- Record compatibility, clipboard/print/save fallbacks, complete-flow usability, artifact size and maintenance cost vs pnpm/launcher. Prefer standalone HTML if required flows/verification/review pass; otherwise document concrete failures and select the signed launcher fallback. Do not disable browser security or decide from a crypto-only demo.

Subtasks:

- [x] EN-04.1 — fully inline actual Svelte sender with shared workspace/crypto/codecs/raw exports and local help; file:// imports, exact text/reset/export/manual fallback pass Chromium/Firefox and installed stable Edge. Glyph display and raw recovery now pass too; remaining bundled recovery, artwork, stable-browser matrix and independent delivery review stay in EN-04.2/.3.
- [ ] EN-04.2 — shared packaging, meta-CSP, glyph/raw/printed-row recovery, SVG/PNG/JSON/print, privacy/manual-copy fallback, runtime notices and external hash-helper regression pass in Chromium/Firefox and stable Edge. Remaining stable Chrome/Firefox, headed usability and independent boundary/hash-verification review are open.
- [ ] EN-04.3 — pending full-flow evidence: record measured selection/support matrix and revise conditional release implementation/review scope. The prototype does not select the release delivery method.

## 5. E02 — cryptography and canonical data

### CRY-01 — implement the exact hybrid encryption profile

Type: story · Priority: P0 · Status: Done · Milestone: M1 · Dependencies: EN-02, KEY-01, CRY-02.

As a sender, I can encrypt exact message bytes locally into an envelope decryptable by the independent receiver.

Acceptance criteria:

- Real WebCrypto uses fresh random 32-byte AES material, RSA-OAEP SHA-256/MGF1-SHA-256 with empty label, fresh 12-byte nonce, AES-256-GCM/128-bit tag, and exact AAD `wrappedKey || nonce`.
- Output is precisely `wrappedKey || nonce || tag || ciphertext`, with assertions for each length and no embedded header/metadata/padding/compression.
- AES `CryptoKey` is nonextractable; owned raw key/plaintext buffers are cleared in `finally` on success and failure, without claiming guaranteed memory erasure.
- Browser encryption is independently decrypted byte-for-byte with both fixture key sizes. Wrong key and mutation in every field are rejected without plaintext release.
- Failures produce no partial result/logged secrets; secure context/capability checks have no fallback crypto.

Subtasks:

- [x] CRY-01.1 — implement profile constants, typed input/output, CSPRNG and OAEP/AES operations.
- [x] CRY-01.2 — implement GCM split/reordering, AAD and envelope assertions, cleanup/error paths.
- [x] CRY-01.3 — add real WebCrypto/Go interop and field tamper/wrong-key tests.

### CRY-02 — implement byte-safe canonical Base64URL and envelope codecs

Type: story · Priority: P0 · Status: Done · Milestone: M1 · Dependencies: EN-02.

As a recipient using external tooling, I receive one canonical text encoding of the exact compatible bytes.

Acceptance criteria:

- Encoding uses only the 64 URL-safe characters, never padding; handles the maximum message size without argument-spread/stack failure.
- Decoding rejects nonalphabet characters, invalid lengths, nonzero pad bits, and aliases through decode/re-encode equality. No implicit whitespace stripping in the cryptographic parser.
- Envelope helpers use modulus-derived offsets, require the minimum size, and preserve an empty ciphertext at library level.
- Length examples pass: 26 bytes → 584 raw characters with RSA-3072 and 755 with RSA-4096; maximum sizes match the plan.
- Codecs stay pure and independent of UI, network, storage, and third-party crypto packages.

Subtasks:

- [x] CRY-02.1 — implement chunk-safe bytes/Base64URL transforms and strict canonical validation.
- [x] CRY-02.2 — implement envelope split/serialize helpers and length formulas.
- [x] CRY-02.3 — test all byte values, boundary lengths, malformed strings/pad-bit aliases, and reference offsets.

### CRY-03 — preserve exact input and local operation lifecycle

Type: story · Priority: P0 · Status: Done · Milestone: M1/M2 · Dependencies: CRY-01.

As a sender, my exact text is encrypted once, and a canceled or cleared operation cannot restore discarded data.

Acceptance criteria:

- Validate the original JS string for unpaired surrogates before TextEncoder or byte counting; valid emoji pairs pass. Then encode exact UTF-8 without trimming/normalization; cap 65,536 bytes; zero-byte UI input fails and whitespace-only text passes. Tests demonstrate that encoder replacement cannot mask an invalid input.
- Key/result snapshots and generation IDs prevent duplicate submit, stale completion after clear/reset, and result relabeling after key changes.
- Success clears the draft; failure retains the draft for retry; explicit discard clears owned state and invalidates pending promises.
- No plaintext/result/history persistence, URL serialization, console logging, or server-rendered message props exists.

Subtasks:

- [x] CRY-03.1 — implement UTF-8 byte count/validation and synthetic Unicode edge cases.
- [x] CRY-03.2 — implement explicit state transitions, immutable recipient snapshots, and generation IDs.
- [x] CRY-03.3 — test double-click, failed encryption, clear-in-flight, key-change, and delayed-resolution races.

## 6. E03 — recipient key handling

### KEY-01 — parse and identify valid public recipients

Type: story · Priority: P0 · Status: Done · Milestone: M1 · Dependencies: EN-02.

As a sender, I can see precisely which supported public key will receive the message.

Acceptance criteria:

- One RSA SPKI `PUBLIC KEY` PEM with supported 3072/4096-bit modulus and exponent 65537 is accepted; wrong type/size/exponent, PKCS#1, private/certificate/multiple blocks, trailing garbage, and >16 KiB inputs are rejected.
- Fingerprint is full SHA-256 of canonical SPKI DER and remains stable across LF/CRLF/line wrapping. Build Node and browser fingerprints agree.
- Errors explain public-format requirements without echoing pasted key contents; a rejected replacement never silently selects another key.
- Public extraction/canonicalization is separate from nonextractable ephemeral AES policy.

Subtasks:

- [x] KEY-01.1 — implement bounded PEM/canonical Base64 and native SPKI validation; check the public integer to reject Firefox's rounded modulus metadata.
- [x] KEY-01.2 — canonicalize public DER and implement fingerprint display/formatting.
- [x] KEY-01.3 — real Chromium/Firefox and Node checks cover both supported sizes, exact adjacent modulus sizes, wrong exponents/types/containers, byte bounds, controlled errors and fingerprint equivalence. See docs/decisions/browser-public-key-validation.md.

### KEY-02 — implement default and custom recipient selection

Type: story · Priority: P0 · Status: Done · Milestone: M1/M2 · Dependencies: KEY-01, EN-03, UX-01.

As a sender, I can use the configured recipient or read/paste another recipient's public key locally.

Acceptance criteria:

- Default identity/key size/abbreviated fingerprint are visible; details show the full fingerprint, PEM download, and independent verification guidance.
- File/paste selection is local and memory-only; inputs are cleared after parsing. Local filename and labels are escaped text and never HTML.
- Missing/invalid default prevents default encryption but leaves custom import available. Failed replacement preserves the previous validated selection with clear feedback.
- Key changes are disabled during encryption; changing after completion uses an explicit new-message action and cannot change the old result's recipient metadata.
- Reset/default restore and reload have the state behavior documented in the plan; no remembered key storage exists.

Subtasks:

- [x] KEY-02.1 — recipient summary/details, explicit public PEM download and accessible file/paste controls pass real-browser keyboard, responsive and CSP checks.
- [x] KEY-02.2 — file/paste selection, custom-only missing default, rejected replacement, clear/reload and default restoration pass real-browser checks. Invalid configured default is handled; encryption/result integration and explicit restart/reset pass.
- [x] KEY-02.3 — local-only behavior, size checking before reading, escaped filenames and input/focus cleanup pass Chromium/Firefox checks. Immutable recipient snapshots, busy/result key locks, explicit new-message and default restoration pass with the integrated sender.

### KEY-03 — publish offline creation, custody, and rotation guidance

Type: story · Priority: P0 · Status: Done · Milestone: M2/M4 · Dependencies: KEY-01, REC-02.

As a user, I can create my own recipient pair outside the site and understand how to retain the private half.

Acceptance criteria:

- `/keys/` includes tested encrypted intermediate generation, strengthened final PBES2/PBKDF2-SHA256/AES256-CBC profile (600,000 iterations), and SPKI extraction for 3072/4096 without plaintext private files or command-line passphrases. Each prompt/file/no-overwrite step is explained.
- Windows instructions link the direct FireDaemon installer, recommend latest patched supported OpenSSL 3.5 LTS after rechecking upstream/vendor advisories, verify expected publisher/hash/architecture, and test the actual executable path in PowerShell. No FIPS claim, stale version pin, or search-ad download guidance.
- Guide distinguishes public vs private PEM, gives OS-appropriate permission/backup advice, and warns that lost private keys cannot be recovered by the website.
- Restrict the setup directory/access before generation (Unix umask vs Windows ACL instructions), check no-overwrite paths, use strong temporary/final passphrases and exclude the weaker intermediate from sync/backups. Remove it only after final-key/pair/backup verification; disclose retained-copy/deletion limits and that 600,000 iterations slow guesses rather than prevent brute force.
- Describes fingerprint verification, encrypted-file/passphrase backup/restore drill, intermediate removal limits, recipient identity, old-key retention, and rotation. The website accepts public keys only; only the verified Go receiver unlocks private keys.
- Default private-key custody is an operator responsibility outside the repository; docs never request real private material.

Subtasks:

- [x] KEY-03.1 — tested encrypted intermediate/final generation and hidden prompts for both sizes, real-browser public import and independent Go recovery; native encrypted-backup receiver drills pass.
- [x] KEY-03.2 — published DER fingerprint, Windows ACL/Unix umask, separate passphrase custody, encrypted-backup drill, intermediate removal limits and rotation guidance.
- [x] KEY-03.3 — guidance matches the development product and distinguishes current verification from future signing/publisher/audit gates. Actual installer payload tested; Unix/ARM64/non-ASCII interactive support is not claimed.

## 7. E04 — visual workspace and repeat-message flow

### UX-01 — establish the trusted, responsive visual system

Type: story · Priority: P1 · Status: Done · Milestone: M2 · Dependencies: EN-01.

As a sender, I get a readable, restrained security workbench with clear labels and recipient information.

Acceptance criteria:

- Apply plan tokens, static header/footer/explanation routes, light-first surfaces, restrained celestial plate styling, and clear primary actions; no fake seals/certifications or copied brand marks.
- 320 px mobile through desktop layouts and 200% zoom keep controls/text accessible; dark preference, reduced motion, and print variants remain legible.
- Measured color states meet relevant WCAG AA contrast; controls have visible focus, clear labels, and preferred 44 px targets.
- Fonts/icons are local; dependencies remain minimal and Svelte 5/CSP-compatible.

Subtasks:

- [x] UX-01.1 — implement CSS tokens, layout shell, responsive surfaces, and utility icons.
- [x] UX-01.2 — build accessible button/notice/dialog/tab/pagination primitives as needed.
- [x] UX-01.3 — verify contrast, touch/zoom/reflow/focus, and restrained brand/security copy.

### UX-02 — build message editing, encryption, and failure feedback

Type: story · Priority: P1 · Status: Done · Milestone: M2 · Dependencies: UX-01, CRY-03, KEY-02.

As a sender, I can type, explicitly encrypt, and understand success or correctable local failure.

Acceptance criteria:

- Exact message textarea, UTF-8 byte counter, recipient summary, input limits, and explicit encrypt action match the plan. Privacy-related input preferences and `dir="auto"` are set.
- Initial message input is visible without scrolling at standard desktop/mobile sizes; custom public-key inputs start in a keyboard accessible accordion. Encrypt/Clear precede the optional readiness-token controls.
- Ctrl/Cmd+Enter submits outside IME composition; Enter inserts a newline. Busy state prevents edits/key switches/duplicate submit without fake timings.
- Initializing/missing key/unsupported HTTPS-WebCrypto states are actionable and do not offer alternate crypto or backend processing.
- Success announces completion and focuses the result; crypto failure preserves the draft/key and exposes a retry path without secret logging.

Subtasks:

- [x] UX-02.1 — wire composer, byte count, capability checks, keyboard shortcuts, and explicit states.
- [x] UX-02.2 — integrate local encrypt adapter and success/error/live-region feedback.
- [x] UX-02.3 — verify IME, multilingual directionality, errors, keyboard flow, and unsupported environment.

### UX-03 — build results, another-message, and clear-all flows

Type: story · Priority: P1 · Status: Done · Milestone: M2 · Dependencies: UX-02.

As a sender, I can save the current ciphertext and then begin a clean new message quickly.

Acceptance criteria:

- Result includes immutable recipient snapshot, profile, length/checksum, raw ciphertext above the glyph grid, and clear sharing/export actions; the composer no longer displays the plaintext.
- Successful encryption automatically shows complete raw ciphertext and the glyph grid together without view toggles; clipboard denial focuses/selects raw text while keeping glyphs visible.
- Primary actions are Download ciphertext (.txt) and Copy raw; the Artwork (optional) group contains complete/page image, full S64M1 SVG and print. Art-only files cannot be decrypted by the v1 CLI; explain accompanying raw delivery and the absence of an SVG importer.
- “Encrypt another message” discards old result, retains current public recipient for this tab, focuses empty input, and explains result loss without repetitive modal prompts.
- “Clear everything” discards sensitive workspace state and custom key, invalidates pending operations, clears inputs, and restores only a valid default.
- Reload/back-forward-cache behavior is tested; no messages appear in title/URL/history state/storage. Result remains accessible without traversing decorative glyphs.

Subtasks:

- [x] UX-03.1 — immutable result shell, accessible raw ciphertext above the always-visible glyph grid and typed Svelte display/artwork action slots; primary raw exports work. Optional complete/page PNG, one-line SVG, metadata and archival print actions pass automated E06 validation; email-client checks remain EXP-01.3.
- [x] UX-03.2 — implement repeat-message/clear-all/pageshow reset and focus handling.
- [x] UX-03.3 — test successive messages, busy clear/discard, reload, history navigation, and screen-reader summaries.

## 8. E05 — glyphs and recovery

### SYM-01 — freeze and render the celestial glyph alphabet

Type: story · Priority: P1 · Status: Done · Milestone: M3 · Dependencies: CRY-02, UX-03.

As a sender, I see a celestial plate that deterministically represents every raw ciphertext character.

Acceptance criteria:

- `S64L1` resolves exactly 64 distinct entries in Base64URL order; verify actual Lucide exports, freeze vector paths/license/provenance, and reject unmapped characters rather than substituting.
- Visual review addresses similar symbols at screen/print/low resolution; package updates do not change released paths or ordering.
- 8/16-column live display preserves LTR order, uses at most 1,024 mounted glyphs, and provides complete pagination with range/total labels. Copy/export operates on the full result.
- Glyphs remain presentation only; accessible raw data/summary and legend exist. Selected archival page positions are independent from responsive grid columns.

Subtasks:

- [x] SYM-01.1 — all 64 pinned named exports/vectors/provenance/licenses checked; explicit pre-release WavesHorizontal/FingerprintPattern corrections recorded.
- [x] SYM-01.2 — fixed-order 512-character preview, 8/16 columns, global offsets, complete pagination and accessible legend implemented.
- Glyph paging returns to the top of the updated grid; verify Next/Previous/First/Last with mouse and keyboard at the final short page as well.
- [x] SYM-01.3 — actual 24/16 px and monochrome print legend reviewed, recognition limits documented; mobile order and maximum 88,102-character result pass. Print artifact/page-fit QA remains E06. Evidence: [E05 record](docs/reviews/e05-evidence.json).
- [x] SYM-01.4 — user-requested S64M1 screen view: literals at positions 1/5/9…, sparse deterministic horizontal mirrors/180° rotations, CircleOff/CircleDashed/Skull nulls after each eight payload characters; original Crosshair payload for `j`. S64L1/raw/recovery unchanged. Cross-page ordering, null exclusion, responsive/CSP/offline/max-size checks pass; [current evidence](docs/reviews/e06-evidence.json) supersedes the earlier development mapping. No larger reading view or fills.

### SYM-02 — implement raw and printed-row recovery

Type: story · Priority: P1 · Status: Done · Milestone: M3 · Dependencies: CRY-02, EXP-04 helpers/form and generated print integration (implemented).

As a recipient, I can validate raw ciphertext or assemble printed raw chunks locally before decrypting.

Acceptance criteria:

- `/restore/` accepts raw `.txt`/paste and explicit printed-row transcription; it returns bounded canonical raw (at most 88,102 characters). Presentation whitespace removal is explicit and separate from strict crypto decoding.
- Check row/page digests with the full S64CHECK1 context; identify the erroneous row/page, require contiguous complete chunks, and check the whole-envelope digest after assembly. Labels and check codes never enter raw ciphertext.
- Refuse SVG/HTML/images with instructions to obtain the raw `.txt` or transcribe printed raw rows. No XML/SVG parser ships in any v1 product; automatic SVG restoration is FUT-08.
- Recovery does not request a private key, run decryption, access email, fetch references, or imply OCR support.

Subtasks:

- [x] SYM-02.1 — bounded canonical raw and exact ordered row/page reassembly with S64CHECK1 and final whole-envelope digest implemented.
- [x] SYM-02.2 — /restore/ raw/transcription island with explicit ASCII cleaning, partial row/page feedback, raw copy/download and unsupported-format refusal implemented.
- [x] SYM-02.3 — malformed/context/order/duplicate/missing/overlap/BOM/markup/max-size cases, actual browser/Go recovery and CSP/network/storage checks pass. Evidence: [E05 record](docs/reviews/e05-evidence.json). No SVG importer.

## 9. E06 — sharing, images, and print

### EXP-01 — implement exact text copying/downloads and image clipboard support

Type: story · Priority: P1 · Status: Review · Milestone: M3 · Dependencies: UX-03, CRY-02, EXP-02.

As a sender, I can copy exact recoverable ciphertext and share the glyph appearance through supported clipboard formats.

Acceptance criteria:

- “Copy raw” and raw `.txt` download contain the entire canonical Base64URL and nothing else, including at maximum size. Metadata is separate and contains no plaintext.
- “Copy artwork image” copies a complete bounded compact-grid PNG from the full result. The 584-character example fits one image despite two print pages; larger results beyond bounds expose “Copy artwork page X of Y.” Raw/.txt remain primary and required; SVG has embedded data but no v1 consumer. Inline SVG email paste is not promised.
- Secure-context/clipboard feature checks are explicit. Success notices follow resolved writes; denial/unsupported rich formats expose manual text copy and image/SVG download.
- Plain text and image clipboard representations are not promised to be pasted together by an email client. No automatic message sending, email API, `mailto` payload, or remote image hosting exists.
- Clipboard checks preserve user activation (precomputed bounded PNG or tested promise-valued ClipboardItem). Unicode symbol-text copying is deferred per the confirmed user choice.

Subtasks:

- [x] EXP-01.1 — implement raw/metadata Blob downloads and neutral filenames.
- [x] EXP-01.2 — implement `ClipboardItem` capability detection, text/PNG copy, feedback, and denial fallbacks.
- [ ] EXP-01.3 — verify complete payload, user-gesture/permissions behavior, and actual paste outcomes in the chosen browser/email matrix.

Browser checks pass; actual Gmail (primary) and Outlook (secondary) unsent draft paste remains in Review because no connected browser session is available. [Evidence](docs/reviews/e06-evidence.json) and [sharing matrix](docs/exports.md).

### EXP-02 — generate ordered, recoverable SVG and bounded PNG artifacts

Type: story · Priority: P1 · Status: Done · Milestone: M3 · Dependencies: SYM-01, CRY-02, EXP-04.

As a sender, I can save the same glyph artwork while retaining an exact recovery path.

Acceptance criteria:

- Trusted vector serializer preserves every raw character exactly once in S64M1 payload tokens, in order; full mixed-grid SVG and paged artwork remain separate clearly labeled layouts.
- Complete `S64SVG1` uses frozen local definitions, S64M1 literal/glyph/null tokens in a 32-column grid, versioned raw metadata and checksum. Serializer tests compare token offsets/ordering and metadata to original raw without adding a runtime XML importer. Raw wire bytes remain unchanged; maximum export fits the future 16 MiB cap.
- Archival pages contain at most 512 raw characters with global offsets, page count, profile/key/map/whole-envelope identity, per-page 12-hex check codes, per-row 8-hex check codes, and readable separate 16-character raw/check recovery rows below the same S64M1 artwork. Nulls are display-only; check labels do not enter copied raw.
- PNG rasterization is local and limited to 4,096 px per dimension/16 megapixels including margins/labels. A complete 32-column compact layout is independent of 512-character archival pagination; 584 payload tokens plus 73 S64M1 nulls require 21 rows/768×504 px artwork area at 24 px cells. It includes all raw tokens in order/blank final cells, and the artwork/raw-file reminder. Archival print/PNG pair each checked 16-character raw row beside its mixed-art row. Large outputs use truthful selected-page fallback, never clipping or unreadable strip shrinking.
- Only trusted pinned paths generate output; no untrusted SVG rendering/HTML/`foreignObject`, remote assets, plaintext, or hidden composer state reaches output. URLs/canvases are cleaned up; errors keep raw/SVG save available.

Subtasks:

- [x] EXP-02.1 — implement shared complete/paged layout, token positions, recovery metadata, and full-envelope/page/row check formatting.
- [x] EXP-02.2 — serialize self-contained SVGs and rasterize bounded PNGs from pinned paths.
- [x] EXP-02.3 — test strip/page inverse ordering, long-output limits, cleanup/failure, no plaintext, and image visual QA.

### EXP-03 — print/save PDF with complete ciphertext recovery

Type: story · Priority: P1 · Status: Done · Milestone: M3 · Dependencies: EXP-02.

As a sender, I can print the plate or save a browser PDF without losing data or printing my message.

Acceptance criteria:

- Print-only DOM uses the full immutable result and 512-character archival pages; default scope is all pages. Preview pagination cannot truncate print output.
- A4/Letter layouts preserve glyph/raw order, header/footer metadata, readable raw chunks, first/middle/final page boundaries, and blank final cells.
- No plaintext/editor/key-entry UI prints. Page count is disclosed before long jobs; subset output is explicitly labeled partial.
- Temporary print state is removed after print; cancellation/retry does not destroy current result. “Print dialog opened” does not claim a file was saved.
- Row/page transcription errors are located using their check codes before reassembly; completed print raw chunks pass whole-envelope checksum and independent decryption using synthetic fixtures.

Subtasks:

- [x] EXP-03.1 — build print document/scope controls and request-only print lifecycle.
- [x] EXP-03.2 — create A4/Letter print CSS and safe page breaks/headers.
- [x] EXP-03.3 — render real browser PDFs, inspect representative pages, and verify raw recovery plus cancel/retry behavior.

### EXP-04 — locate page and row transcription errors locally

Type: story · Priority: P1 · Status: Done · Milestone: M3 · Dependencies: CRY-02.

As a recipient retyping a printed artifact, I can find an incorrect page or row before reassembling the whole envelope.

Acceptance criteria:

- Implement exact `S64CHECK1` JSON-array domain-separated SHA-256 inputs from the plan, using full envelope/fingerprint identity, profile/map, total length, integer page/row indices, offsets, and exact raw chunks. No change to encryption envelope/AAD occurs.
- Full page/row digests enter metadata; page headers show 12 hex characters and raw rows show 8. Human positions are one-based; schema indices/offsets are zero-based. Labels and whitespace are excluded from raw payload.
- Whole-envelope checksum is accurately described as final assembly verification, not a page-local check. All public checks are described as accidental-error aids, not authenticity or resistance to an attacker recomputing them.
- Local restore/transcription mode accepts printed identity/page context and typed rows/check codes, identifies specific failed rows/pages, reports context/order errors, and rejects duplicate/missing/overlapping chunks.
- A changed row is identified before the rest of the document is present; wrong-page mix, label/context changes, reordered pages, empty/missing chunks, and partial final rows are tested.

Subtasks:

- [x] EXP-04.1 — exact native SHA-256 helpers and independent compact JSON encoding vectors implemented and verified.
- [x] EXP-04.2 — full SVG/JSON page/row metadata and printed 12/8-hex labels integrated; PDF-extracted checks/hash and independent Go recovery pass. [E06 evidence](docs/reviews/e06-evidence.json).
- [x] EXP-04.3 — early row localization, wrong identity/page, partial final rows, offsets, complete ordered assembly and final digest pass. Labels stay outside raw. Evidence: [E05 record](docs/reviews/e05-evidence.json).

## 10. E07 — static security and privacy hardening

### SEC-01 — enforce production CSP and host headers

Type: enabler · Priority: P0 · Status: Done · Milestone: M4 · Dependencies: EN-01, EXP-01, EXP-03.

Acceptance criteria:

- Exact build emits valid script/style hashes; enforced production policy follows the plan, including `connect-src 'none'`, `object-src 'none'`, restricted local assets, no unsafe-eval/unsafe-inline, and host `frame-ancestors 'none'`.
- Required referrer/MIME/frame/permission headers are generated for the selected static host. No reliance on CSP meta for unsupported directives.
- Hydration, all views, import/restore/copy/download/raster/print operate under the same enforced policy with no unexplained CSP errors.
- Dev HMR policy is isolated; no production runtime dependency on a permissive dev policy or same-origin fetch.
- Audit production DOM/HTML/SVG/print artifacts for all style attributes and Svelte style/transition directives under `style-src-attr 'none'`; use classes and SVG geometry attributes. Keep `worker-src 'none'` until a measured worker feature explicitly updates policy/tests.

Subtasks:

- [x] SEC-01.1 — shared exact-hash HTTP/file policy and production/provider generation; attributes/workers/connections remain blocked.
- [x] SEC-01.2 — actual local production headers, startup stale-policy refusal and immutable 4324 snapshots.
- [x] SEC-01.3 — full browser/export flows, deliberate CSP refusal probes, stale-hash/header tests and fresh Vercel serialization pass. Adapter-free instructions in docs/deployment.md; final deployed responses remain REL-04.

### SEC-02 — prove intended local-only data flow and memory-state behavior

Type: story · Priority: P0 · Status: Review · Milestone: M4 · Dependencies: UX-03, EXP-01, SYM-02, SEC-01, REC-02.

Acceptance criteria:

- Initial requests are same-origin static assets with no sensitive fields; no remote requests occur while typing/encrypting/importing/restoring/copying/exporting after assets load.
- Warm the app, block HTTP networking, and complete all supported actions. Inspect logs, URLs/title/history, cookies, local/session storage, IndexedDB, CacheStorage, and service-worker registration.
- Reload/close/history restore behave as documented; no hidden autosave/result resurrection occurs. Best-effort byte cleanup remains correctly limited in claims.
- Host analytics/widgets/error collectors/prefetch are absent or explicitly disabled; provider access-log disclosure stays accurate.
- Receiver unlock/decrypt/output works with network disabled; it has no listener/HTTP client, private material in arguments/env/logs, automatic clipboard/editor, key cache, or partial plaintext on failure. CLI output files are deliberate exports, not application history; the privacy copy makes that distinction.

Subtasks:

- [x] SEC-02.1 — complete warmed browser actions with HTTP blocked/context offline; logs/URLs/title/history/cookies/local/session/IndexedDB/CacheStorage/service workers remain empty of inputs.
- [x] SEC-02.2 — reload/history/close-reopen and explicit persisted-pageshow reset draft/custom recipient/result/recovery/print.
- [x] SEC-02.3 — author bundle/source audit and privacy disclosure updated; native receiver/private-output tests pass without browser/network code. OS-enforced receiver network-denial observation remains an acceptance dependency; story stays Review.

### SEC-03 — verify dependencies, static artifact, and trust copy

Type: enabler · Priority: P0 · Status: Done · Milestone: M4 · Dependencies: EN-03, SEC-01, KEY-03.

Acceptance criteria:

- Frozen installs/builds succeed; runtime dependencies are minimal and licensed; pinned vector artifacts have provenance and complete notices. Go receiver dependencies are only pinned Go-maintained x/term/x/sys; no third-party crypto/key decoder. Verify authenticated module cache with go mod verify and compare freshly regenerated vendor's full tree/file set/modules.txt with committed vendor; module-cache verification alone is insufficient. Offline -mod=vendor builds use the pinned supported toolchain and unchanged go.mod/go.sum.
- Hosted artifact check rejects fixture/private PEM, browser/test-only decrypt code, receiver package imports, server functions/API routes, remote runtime resources, secret env names, and sourcemap/telemetry uploads. The supported Go decrypt executable is separately signed/packaged; download links do not expose private material.
- Security/privacy/about copy states browser processing, selected recipient custody, length leakage, delivered-JS trust, verified offline-release option, lack of sender authentication/forward secrecy/post-quantum security, and review status accurately.
- Public code-native diagrams match browser processing and current Go API behavior. Historical PNGs/backend claims and the incorrect `rand.Reader` blinding label do not enter public documentation.
- No unsupported zero-knowledge/IND-CCA2 proof/constant-time/FIPS/government claims appear. Source and build evidence reflect what is actually verified.

Subtasks:

- [x] SEC-03.1 — frozen offline install, actual browser-bundle pins/notices, production fixture/public/private/source-map/API/persistence exclusions, full Go module/vendor/offline gates and separate receiver artifacts pass.
- [x] SEC-03.2 — current privacy/security/how-it-works with code-native browser/export/offline-Go flow, public recipient facts and pending trust anchors.
- [x] SEC-03.3 — author output/copy audit, public-route 320px/style checks and negative artifact mutations pass; no integrated independent audit or release claim.

### SEC-04 — establish lookalike and delivered-code trust controls

Type: enabler · Priority: P0 · Status: Review · Milestone: M4/M5 · Dependencies: KEY-03, SEC-03.

Acceptance criteria:

- Document independently trusted official origin, expected Authenticode publisher, exact reviewed artifact hashes and default recipient fingerprint. Same-site hashes/badges/TLS are not described as proof of honest code or recipient identity.
- Public guidance covers bookmarks, search ads/unsolicited links, expected-publisher verification, recipient confirmation and use of a pinned local sender before sensitive typing when the host is untrusted. Private keys/passphrases never go to the hosted website.
- Establish operational owners for domain/signing identity, independent verification channel, incident/rotation notice and reviewed-release hashes. A clone can copy all visible page content; controls do not claim to detect every clone automatically.
- Publish a private vulnerability-reporting route and triage owner before public release. State what versions are supported and how to report safely; do not promise a response SLA until an owner accepts it. Never ask reporters to send secrets or production private keys.
- Test altered keys/assets/manifests, wrong publisher/hash, cancel/error paths and instructions with synthetic data. A signed binary proves provenance relative to a trusted identity, not safe code; it needs review too.

Subtasks:

- [ ] SEC-04.1 — user is undecided; proposed free https://zodiac-modern.vercel.app only. Confirm origin/control, publisher, reviewed final hashes, independent channel and operational owners before release; config/release-trust.json records pending fields.
- [x] SEC-04.2 — recipient/bookmark/lookalike/externally verified local sender guidance; no fake badges or signed download. External helpers never start files.
- [x] SEC-04.3 — altered key/input/HTML/CSP/header, fixture leak, unsigned receiver/wrong hash/publisher refusal paths pass; full signed positive release/novice verification trials remain release gates. docs/hardening.md records the hosted plaintext trust gap.
- [ ] SEC-04.4 — select and publish a private vulnerability-reporting route, triage owner, scope, and supported-version policy before release; do not invent a security contact or response-time commitment.

## 11. E08 — integrated quality and independent review

### QA-01 — run the full browser/Go compatibility and attack-regression matrix

Type: enabler · Priority: P0 · Status: In progress · Milestone: M4 · Dependencies: CRY-01, CRY-02, CRY-03, KEY-01, SYM-02, REC-02.

Acceptance criteria:

- Chromium/Firefox encryptions with both RSA sizes decrypt using the actual shipping CLI and independent oracle; Go test envelopes decrypt in test-only browser code. Compare exact bytes, not random ciphertext equality. Do not replace independence with two callers of the same library. WebKit is optional nice-to-have coverage and does not block QA-01.
- Full multilingual/boundary corpus, repeated input, canonical Base64URL, wrong key, every field mutation/truncation, spliced key/nonce, malformed RSA recovery length, and parser negatives pass.
- Fixed public serialization/known-answer cases supplement randomized tests; no browser native crypto mocks are used as proof of compatibility.
- Required Chromium/Firefox regression suite runs in CI with recorded versions and synthetic data only; failures block release. WebKit coverage is optional.
- Re-run REC-01's real OpenSSL 3.0/3.5 fixture/profile/oracle matrix, parser/KDF bounds and pre/post-KDF fuzz regressions against the integrated receiver; terminal cancellation, safe outputs, fingerprint agreement and CLI error categories pass. Synthetic malformed OAEP payloads recovering 16/24/31/33 bytes fail the fixed 32-byte suite even if AES otherwise accepts the size.

Subtasks:

- [x] QA-01.1 — Chromium/Firefox browser/Go positive and reverse-direction matrix passes for both RSA sizes; WebKit remains optional.
- [x] QA-01.2 — tampering/canonicalization/input/key-validation, cleanup/error-path, field-splice and receiver-command regression cases pass. Native hidden-terminal receipts cover Chromium/RSA-3072 and Firefox/RSA-4096; this is author-run evidence.
- [ ] QA-01.3 — publish CI evidence, tool versions, fixture designation, and unresolved compatibility limits.

### QA-02 — verify accessibility, exports, performance, and email paste behavior

Type: enabler · Priority: P1 · Status: In progress · Milestone: M4 · Dependencies: UX-03, SYM-01, EXP-01, EXP-02, EXP-03, SEC-02, REC-03.

Acceptance criteria:

- Keyboard/manual screen reader and automated accessibility checks cover forms/views/dialogs/live regions/focus; contrast/reflow/RTL/plaintext/LTR ciphertext/reduced motion pass.
- SVG/PNG/PDF visual QA covers short, partial-final, and long paginated outputs. Every exported raw chunk round-trips; page/row check codes identify synthetic transcription mistakes before full reassembly; no plaintext/clipping/omission exists.
- Recorded hardware/browser measurements assess ≤200 KiB initial compressed JS, encryption/result targets, ≤1,024 mounted glyphs, canvas limits, and UI long tasks; misses are resolved or explicitly reviewed before release.
- Actual email paste tests cover supported browser targets and selected Gmail/Outlook/Apple Mail clients using disposable synthetic data only. Record whether image/source/HTML/plain-text representations survive; unsupported SVG/email cases have explicit fallback guidance.
- Any rich-email convenience feature is not marked supported merely because its HTML renders in a local browser. No live email is sent through agent tools without explicit authorization.
- Five representative nontechnical recipients trial the supported Windows guide; after setup at least four decrypt one synthetic message with one copied command without assistance. Paths with spaces, wrong key/password, tampering and existing output files produce corrective guidance; no private key is uploaded. Record failures and improve UX before release.

Subtasks:

- [ ] QA-02.1 — conduct a11y/responsive/manual focus and assistive-technology checks.
- [ ] QA-02.2 — render/inspect export artifacts and measure performance on recorded reference devices.
- [ ] QA-02.3 — perform synthetic clipboard/email-client compatibility checks and document supported/fallback sharing paths.

### QA-03 — obtain and disposition an independent security review

Type: enabler · Priority: P0 · Status: In progress · Milestone: M4/M5 · Dependencies: QA-01, SEC-01, SEC-02, SEC-03, SEC-04, REC-01, EN-04.

Acceptance criteria:

- Qualified review includes composition/IND-CCA2 objective, encodings, Go receiver/terminal/output/keyfile/KDF bounds, custody/identity, delivered-JS trust, independent release verification and signing, plus the EN-04 selected file:// CSP/runtime boundary or native launcher. If REC-04 is implemented before review, include its cleanup routine, one-time-key lifecycle, and user-facing erasure claims. SVG import is excluded from v1 and receives a separate FUT-08 review.
- Reviewer findings/severity/scope/limitations are recorded; all critical/high findings are fixed and independently rechecked. Tests and implementation self-review are not relabeled as independent review.
- Formal security wording follows the actual assessment; absence of review prevents reviewed/verified IND-CCA2 marketing claims and keeps the public release gate open.
- No real production private key or user plaintext is given to the reviewer through this project.

Subtasks:

- [x] QA-03.1 — profile/threat boundaries/source hashes/test evidence and review scope prepared in docs/reviews/m4-review-packet.md and docs/reviews/e08-qa-matrix.md; qualified reviewer selection remains pending.
- [ ] QA-03.2 — record assessment/findings and create linked fix tasks for every required remediation.
- [ ] QA-03.3 — verify remediations, review permitted claims, and publish an accurate review status.

## 12. E09 — production release and operations

### REL-01 — provision the real public recipient and complete custody verification

Type: enabler · Priority: P0 · Status: Backlog · Milestone: M5 · Dependencies: KEY-03, EN-03, QA-01, REC-03.

External input: operator supplies only the production **public** PEM, recipient identity, and independently confirmed full fingerprint. These inputs are not present at this planning baseline; do not invent them.

Acceptance criteria:

- Valid real recipient config builds without fixtures/fallback; name/fingerprint in served PEM, generated app, key details, and artifacts agree.
- Encrypted private key/passphrase custody stays outside repo/build/host; intended recipient verifies the key pair and decrypts a synthetic production envelope using the shipping CLI, including encrypted-backup restoration. Record nonsecret confirmation only.
- Independent fingerprint publication/verification and tested recovery/rotation procedure exist; old-key retention policy is recorded.
- Build validator rejects missing/mismatched/test key config and never starts a throwaway pair.

Subtasks:

- [ ] REL-01.1 — document public input handoff and independently verify recipient identity/fingerprint.
- [ ] REL-01.2 — install only public configuration and run the production build/consistency checks.
- [ ] REL-01.3 — have the recipient verify offline decryption/custody/rotation using synthetic data and record nonsecret evidence.

### REL-02 — publish the verified static artifact and exercise rollback

Type: story · Priority: P0 · Status: Backlog · Milestone: M5 · Dependencies: REL-01, REL-03, REL-04, QA-02, QA-03, SEC-03.

As a user, I can access a stable HTTPS site whose deployed behavior matches the reviewed release.

Acceptance criteria:

- Deploy the static release to Vercel first with generated security headers; no Astro runtime adapter, API/functions/secrets, analytics or remote injected resources. Document Cloudflare Pages/Netlify alternatives and Surge limitations from REL-04.
- Final-origin HTTPS/CSP/MIME/referrer/frame/permission headers and complete smoke flow are checked, including local encryption, custom key, copy/export/restore, and missing-key failure.
- Deployment evidence identifies source commit/build checksums/versions and key fingerprint; source/license/security/privacy/deployment/offline guides are linked and accurate. Hosted and local application assets match the reviewed release.
- Prior known-good artifact/config can be restored; rotation rollback does not discard private custody or mislabel existing ciphertext. Public release occurs only after all required P0/P1 AC and launch gates pass.

Subtasks:

- [ ] REL-02.1 — choose provider/domain, document header/cache/TLS setup, and prepare deployable artifact.
- [ ] REL-02.2 — deploy within the user's authorized scope and verify final-origin behavior/headers/data flow.
- [ ] REL-02.3 — exercise artifact rollback and record release manifest, remaining limits, and maintenance ownership.

### REL-03 — verify and distribute the selected offline sender and signed Go decrypt CLI

Type: enabler · Priority: P0 · Status: Backlog · Milestone: M5 · Dependencies: REL-01, QA-03, SEC-03, SEC-04, REC-02, EN-04.

As a user concerned about mutable hosted code, I can independently verify a pinned release and run its reviewed assets locally without automatic updates.

Acceptance criteria:

- Package the EN-04 selected sender (self-contained HTML preferred if it passes; native launcher only if justified), separately signed Go receiver, public configuration/licenses/versions/instructions and per-file SHA-256 manifest. Publish final ZIP, selected HTML and receiver hashes independently; sign native files before hashing, exclude manifest self-hash. Pnpm source use remains supported in either case.
- Expected Authenticode publisher and exact reviewed hashes are independently trusted before execution. Signing credentials/rotation are managed outside repo/build inputs and separate from recipient keys. Missing signing/trust inputs leave this gate open; no OS-warning bypass advice or unproven reproducibility claim.
- If standalone HTML is selected, verify its full hash outside the file before opening; ship documented tested browsers/meta-CSP limits/fallbacks and no native sender/signing/server dependency. If a launcher is selected, sign it, pin the asset manifest, confine loopback Host/paths/GET-HEAD/MIME/security headers, reject mismatches and provide Quit/no admin. No private-key/message/decrypt API or receiver imports/listener in either path. Node helper supports pnpm local source use.
- With external networking blocked, fresh local sender load/reload/default/custom/encrypt/export/raw-recovery and CLI unlock/decryption work. No updater/service worker/remote asset/key change; disclose unrelated OS signature/reputation networking during installation.
- Test altered ZIP/HTML/manifest/assets, wrong applicable publisher/hash, output permissions, fingerprints and rollback; traversal/reparse/Host/method attacks apply if a launcher ships. Independent hash or signed origin does not prove safe code or an uncompromised device.

Subtasks:

- [ ] REL-03.1 — package/sign controlled binaries, manifests and separate hashes; establish expected publisher and trusted review channel.
- [ ] REL-03.2 — productionize the EN-04 selected sender; implement/sign a confined static launcher only if that path is selected. Otherwise record the native-launcher subtask as not applicable with decision evidence.
- [ ] REL-03.3 — test fresh offline sender/CLI flows, signature/tamper checks and rollback; publish accurate versioned evidence.

### REL-04 — support Vercel deployment, alternative hosts and pnpm local use

Type: enabler · Priority: P1 · Status: Backlog · Milestone: M4/M5 · Dependencies: EN-01, EN-03, SEC-01.

Acceptance criteria:

- Primary Vercel configuration uses static Astro, frozen pnpm install, `pnpm build`, `dist` and static Build Output API config/headers generated from exact artifact hashes after building. Do not rely on mutating root vercel.json after provider config evaluation or deploying stale hashes. No SSR adapter/functions/API or production analytics/toolbar injection.
- Document equivalent Cloudflare Pages and Netlify static builds with generated `_headers` from the same policy source. Validate syntax/header limits and actual final-origin CSP/frame/MIME/referrer/permissions/cache behavior before marking a provider supported.
- Surge is optional/conditional: verify current HTTPS and arbitrary header support for the actual account/config. If required headers cannot be enforced, label it unsupported for the hardened release; do not imply CSP meta provides `frame-ancestors`. A proxy adding headers is a separate documented deployment choice.
- README/local guide supports verified source checkout, supported Node/pinned pnpm, frozen install, `pnpm dev` for development, and `pnpm build` plus `pnpm start:local` for actual built sender with enforced headers and loopback binding. `pnpm local` combines the latter; no Go/OpenSSL needed to run encryption.
- Explicit custom-key-only local mode can run without production public configuration and visibly has no default recipient. Production Vercel builds still fail on missing/mismatched/test defaults. Never generate a throwaway key, expose LAN by default, or relax production CSP for HMR.
- Test Windows paths with spaces, fresh clone/install/build, local browser reload and no message API. Install/build may fetch dependencies; once installed/built the local sender needs no external networking. Source builds require trusted code/dependencies; locality alone is not verification.

Subtasks:

- [ ] REL-04.1 — implement one policy source and Vercel/Pages/Netlify output/config, and document Surge eligibility.
- [ ] REL-04.2 — implement/document pnpm dev/build/start:local/local/custom-only modes with secure loopback serving.
- [ ] REL-04.3 — verify primary final origin, chosen alternatives, clean local setup and correct missing-key policy.

## 13. E11 — supported offline Go recipient

### REC-01 — implement and validate encrypted-PKCS#8 key loading early

Type: enabler · Priority: P0 · Status: Done · Milestone: M0 · Dependencies: DOC-01.

Execution order: first establish the real OpenSSL 3.0/3.5 fixture/oracle baseline from REC-01.3, then prototype REC-01.1 against it, complete the negative/fuzz/resource evidence, integrate REC-01.2, and obtain the focused independent loader review. Start alongside EN-01; no dependency on Astro, EN-02's envelope harness, KEY-01's browser importer or production custody. Code, real fixtures and passing checks exist; user-supplied review findings and their disposition are recorded in [docs/reviews/2026-10-03-feedback.md](docs/reviews/2026-10-03-feedback.md). Expanded required fuzz seeds and reproducible local gates pass. The user supplied conditional focused approval; its follow-up fixes and native Windows behavior are verified in docs/reviews/2026-10-03-rec01-followup.md. Exact LF fixture and covered-source evidence is refreshed. The CI regression workflow stays in workflows/ as a template by explicit user instruction, with its local checks available. See docs/reviews/rec01-review-packet.md.

Acceptance criteria:

- Implement repository-owned `receiver/internal/keyfile/pbes2.go` using Go standard-library primitives/parser and a single fixed profile. This supersedes decoder selection and the old ban on handwritten PBES2 integration. No third-party decoder, algorithm registry, custom crypto/KDF/TLV parser, legacy DecryptPEMBlock, plaintext/legacy fallback or OpenSSL runtime subprocess. Pin a currently supported patched Go toolchain with the Go 1.24+ crypto/pbkdf2 API; a 150-line estimate is not a security gate.
- Before wider interop/UI work, build and record the prototype against actual isolated OpenSSL 3.0 and 3.5 executables, both RSA sizes, recording versions/providers/generator commands, fixture hashes/public fingerprints and decoded profile fields. Record expected rejection separately from successful import. OpenSSL 3.0 lacks the 3.5 CLI salt-length option; do not silently accept a sub-16-byte salt. Test supported 3.5 output with explicit -saltlen 16 and 3.0-origin keys rewrapped by 3.5 with unchanged public halves and no plaintext intermediate. Testing the older branch is not a user recommendation to install it.
- Accept one `ENCRYPTED PRIVATE KEY` PEM, capped at 16 KiB before parsing, with no PEM headers, extra blocks or non-whitespace prefix/suffix. Require PBES2 (`1.2.840.113549.1.5.13`), PBKDF2 (`1.2.840.113549.1.5.12`), explicit HMAC-SHA256 PRF (`1.2.840.113549.2.9`) with NULL parameters, and AES256-CBC (`2.16.840.1.101.3.4.1.42`). Salt is a primitive 16–64-byte OCTET STRING, iterations 600,000–2,000,000, IV exactly 16, key length absent or explicitly 32, ciphertext nonempty/bounded/divisible by 16. Reject default/SHA1 PRF and explicit zero key length.
- Separate bounded parse/policy validation from KDF/unlock. Check exact nested SEQUENCE fields, class/tag/constructedness/order, parameter presence and full consumption with encoding/asn1 RawValue; empty outer rest alone cannot catch ignored extra struct fields. Reject unknown/duplicate/trailing members, otherSource salt, overflow/negative integers and hostile lengths before costly derivation/CBC; no panic/unbounded recursion/allocation.
- Use `pbkdf2.Key(sha256.New, string(passphraseBytes), salt, iterations, 32)` and handle its error, then native AES/CBC. Scan all 16 final-block bytes uniformly for PKCS#7 length/value validity before parsing. Check complete fixed version-0 RSA-NULL PKCS#8 and two-prime PKCS#1 structure without trailing/unexpected fields, then call x509.ParsePKCS8PrivateKey; require *rsa.PrivateKey, exactly two primes, e=65537, 3072/4096 modulus bits and Validate success. Derive the actual canonical SPKI fingerprint.
- Prompt through a controlling terminal without echo using pinned/vendor-reviewed x/term and its Go-maintained x/sys dependency (also allowed for Windows ACLs); no secret argv/env/piped stdin/history/logs. Accept at most 1,024 password bytes, cancel safely and restore terminal; missing terminal is an actionable refusal. Clear owned passphrase bytes, derived key and entire decrypted allocation on all paths. Native PBKDF2 needs an immutable password string; string/internal/key-integer/OS copies cannot be guaranteed erased. Do not add unsafe string conversions or a custom KDF.
- Every key format/profile/password/padding/inner-key validation failure has the same local unlock message/exit 3. CBC has no MAC; successful padding/parse/Validate is not authenticated key-container encryption. No remote unlock service, guaranteed erasure, audited-glue or whole-program constant-time claim. Keep ciphertext/usage and I/O errors in their existing categories.
- Mandatory differential tests use the recorded OpenSSL 3.0/3.5 pkcs8 -topk8 fixtures and pkcs8 -in as local oracles for both key sizes, comparing canonical public halves. Include all valid profile boundaries, wrong passwords, all padding lengths 1–16/corrupt bytes, invalid/multi-prime keys and hostile schema inputs. Fuzz pre-KDF parsing with a test-only KDF stub/counter, plus bounded post-KDF CBC/padding/inner parsing; seed SHA1/absent PRF, omitted/invalid PRF parameters, 10^9/negative/overflow iterations, 1 MiB salt/file, IV lengths, explicit zero/wrong key length, trailing bytes/extra nested members and adversarial lengths. Unsupported inputs never invoke real PBKDF2. Independent review covers the owned loader and tests.
- youmark/pkcs8 and .NET runtime source are read-only references with inspected commit provenance; neither is a production dependency. Do not copy broader algorithms/permissive defaults. Optional CI-only .NET oracle uses decoded DER, identical password bytes and a full bytesRead check, not out _. Pin/vendor Go-maintained modules; local go mod verify, complete regenerated-vendor comparison and offline builds pass here in M0; SEC-03 later re-runs these checks on the integrated artifact, without blocking the initial loader work.
- REC-01 and M0 cannot become Done without real fixture/oracle, strict negative corpus, recorded pre/post-KDF fuzz runs/resource bounds, measured KDF latency, vendor integrity and focused independent review with fixes verified. These gates are non-negotiable; no postponing them to M2, mock substitution or schedule waiver. Maintain CI regression evidence and re-open affected gates after loader/policy/toolchain changes; QA-03 later covers the integrated system without replacing the early review.

Subtasks:

- [x] REC-01.1 — implement keyfile/pbes2.go using the Go standard library, with youmark/pkcs8 and the .NET runtime source as read-only references. Implementation is not review completion.
- [x] REC-01.2 — bounded hidden prompt/cancellation, cleanup/error mapping, strict RSA/private-exponent consistency and fingerprints pass. Pinned x/term/x/sys provenance/full vendor verification pass. Native Windows navigation, Ctrl-C and blocked-read restoration tests pass; unexpected cancellation errors are observed only after reader shutdown.
- [x] REC-01.3 — real OpenSSL 3.0/3.5 fixtures/oracles preceded the prototype; strict tests, pre/post-KDF fuzz/resource/latency and vendor evidence pass. User-supplied focused approval was conditional on the follow-up fixes, now verified. See docs/reviews/2026-10-03-rec01-followup.md and exact current evidence. QA-03/release remain separate.

### REC-02 — implement authenticated offline decryption and safe plaintext output

Type: story · Priority: P0 · Status: Done · Milestone: M2 · Dependencies: REC-01, CRY-02, CRY-01.

As a recipient, I decrypt a received raw text file with one command, keeping my private key/passphrase local.

Acceptance criteria:

- `zodiac-decrypt decrypt --key <encrypted.pem> --in <ciphertext.txt> --out <new-message.txt>` uses only file paths in arguments and the hidden local prompt. No CLI encryption/keygen feature, server/listener, network, updater, browser receiver, key cache or telemetry.
- Adapt reference_impl.go.md envelope split/OAEP/AAD/tag-recombine/GCM logic while removing all server/CORS/env/fallback initialization. Enforce canonical raw/size limits and exactly 32 recovered AES bytes. Do not copy unchecked synthetic RNG or incorrect timing/blinding claims; tests exercise real native crypto.
- Authenticate before any plaintext release/file creation; identical generic message failure/exit 4 for wrong key/OAEP/GCM. Input/usage, local key unlock and I/O have documented separate corrective categories without secret diagnostics or timing promises.
- Require valid UTF-8 and preserve exact authenticated bytes, including empty crypto-level messages and terminal control characters. No automatic terminal/stdout/clipboard/editor output. Use exclusive new-file creation only after authentication, private Windows ACLs/POSIX permissions as appropriate, reject symlink/reparse redirection/existing paths, and remove partial output on write failure.
- Windows output is an ordinary local-disk file only. Reject UNC/network destinations, mapped network drives, named pipes/device namespaces (`\\.\`), extended/device namespace forms (`\\?\`, including GLOBALROOT/UNC), alternate data streams, drive-relative paths and reserved device components (including extension/trailing-dot/space aliases). Check every parent directory for reparse redirection, not just the final name, and establish the local-volume/file type through OS handles without creating plaintext before authentication. Test parent-swap/reparse races, aliases and private ACL inheritance; lexical string checks alone are insufficient. Shared input-path rules must also preserve offline/no-network behavior.
- Clear owned AES/passphrase/DER/plaintext buffers and release private state best effort on success/failure/cancel. Tests cover tampering/length/aliases, output permissions/races/write failure/cancel, no secret logs and offline execution. No claim that Go heap/key integers/OS paging or exported files are securely erased.

Subtasks:

- [x] REC-02.1 — extract corrected compatible Go decrypt core and CLI command/error contracts.
- [x] REC-02.2 — implement authenticated output creation, Windows permissions, safe paths/cancellation and cleanup.
- [x] REC-02.3 — run real browser/CLI and independent oracle regressions, tampering and output-lifecycle checks.

### REC-03 — document and prove recipient readiness

Type: story · Priority: P1 · Status: Review · Milestone: M2/M4 · Dependencies: REC-02, KEY-03, UX-01.

As a nontechnical recipient, I know which verified executable/key/files to use and can recover a real test message.

Acceptance criteria:

- `verify-key --key <encrypted.pem> --public <public.pem>` unlocks locally, compares actual canonical public halves/fingerprints and returns nonsecret identity/size only. Wrong pairs fail; no default-key substitution or network identity lookup.
- `/receive/` is static instructions/download links only. Include independently verified publisher/hash steps, exact PowerShell command with quoted paths, architecture/version, filenames/headers, passphrase prompts, success/output location and actionable wrong-file/password/tamper/existing-output guidance. No request to paste private contents into the site/support.
- A guided nonsecret sender→CLI round trip and encrypted backup restoration confirm recipient readiness through the existing trusted channel. Production setup must pass it; encryption/checksums alone do not prove private-key possession or sender identity.
- One-command decryption usability is tested in QA-02. The guide is accessible and explicitly acknowledges CLI friction and plaintext-file persistence; no OpenSSL/manual cryptographic steps per message.

Subtasks:

- [x] REC-03.1 — verify-key pair/error/fingerprint tests and native restored-key verification pass for both supported sizes.
- [x] REC-03.2 — static receive/setup/error/backup guide implemented; signed download/publisher links remain conditional release gates and are not fabricated.
- [ ] REC-03.3 — browser token/Go round trip and native original/restored encrypted-backup helper trials pass for both sizes. Operator's own backup drill and observed first-time user trial remain pending; [trial record](docs/reviews/rec03-readiness-trial.md), [native evidence](docs/reviews/rec03-helper-evidence.json). No participant outcome inferred.

## 14. E10 — explicitly deferred decisions

| ID | Type | Priority | Status | Scope and entry condition |
| --- | --- | --- | --- | --- |
| FUT-01 | Enabler | P2 | Deferred | Browser RSA generation/private export: separate explicit request, custody/erasure review, user-controlled backup UX; never silently add to import flow |
| FUT-02 | Enabler | P2 | Deferred | HPKE/post-quantum/signatures/padding/commitment: separately versioned protocol and receiver/interoperability/security assessment |
| FUT-03 | Story | P2 | Deferred | Image OCR/QR recovery: validated error handling/capacity; existing raw recovery stays available |
| FUT-04 | Enabler | P2 | Deferred | Worker/PWA/service-worker installation: separate from the required verified localhost ZIP; justify from measured performance or new requirements and update policy/privacy tests |
| FUT-05 | Story | P2 | Deferred | Additional languages, broader RSA sizes, custom glyph skins: validate accessibility/key performance and preserve released map/profile semantics |
| FUT-06 | Story | P2 | Deferred | Rich inline SVG/HTML email copy: enable only for tested client combinations; never replace a recoverable raw/SVG attachment path |
| FUT-07 | Story | P2 | Deferred | Unicode symbol-string sharing: only on later request; explain changed font appearance and define a separately frozen reversible alphabet |
| FUT-09 | Enabler | P2 | Deferred | Browser receiver/encrypted-PEM import or native receiver GUI: new explicit scope and importer/key-custody/security assessment; v1 receiver is the confirmed Go CLI |

### REC-04 — add optional single-use recipient-key and cleanup workflow

Type: story · Priority: P1 · Status: Backlog · Milestone: M4 · Dependencies: REC-02, REC-03.

As a sender and recipient of a one-off confidential message, I can use a dedicated recipient RSA keypair for that message, verify and share its public half, decrypt with the existing envelope, then optionally attempt best-effort cleanup of the plaintext output and one-time private-key file.

Acceptance criteria:

- Define and document the one-off key lifecycle using the existing supported OpenSSL RSA-3072/4096 profile: generate a fresh pair offline for one message, verify the encrypted private key matches the public key and compare the full fingerprint through the existing local verification flow, send only the public PEM/fingerprint, and use the matching private key for that message. No separate regular recipient key is required in this mode. Do not add key IDs to the envelope or change its bytes.
- Explain that the sender’s fresh random AES key is independent per message; it is not derived from a previous message key. A fresh RSA pair per message compartmentalizes ciphertexts across private keys, while later recovery of that message’s private key can still decrypt its ciphertext. Ratcheting is designed for evolving multi-message sessions and is not required to secure this one-message workflow. Do not call single-use RSA ratcheting or claim protocol-level forward secrecy. Preserve static-key mode with a warning that later compromise of its private key can expose retained ciphertext.
- Keep the current authenticated file-output workflow and exact formatting. Do not print plaintext to stdout or launch an editor. Define an explicit post-decrypt wait/finish interaction (user keypress or configured timeout) before attempting cleanup; specify what happens on cancellation, process termination, write failure, and invalid cleanup path.
- Cleanup is opt-in, best effort, and reports separate outcomes for plaintext output and private-key cleanup. Never claim that bytes are physically erased or that snapshots/copies do not exist. A cleanup failure must not be reported as success.
- Private-key deletion is permitted only when the user explicitly marks/selects a single-use key for this operation. Preserve static-key files by default; static keys remain supported and documentation warns that later compromise can expose retained ciphertext. Explain that deleting a single-use key can reduce later cross-message exposure but cannot guarantee all copies are gone or provide ratcheting.
- Write plaintext only after GCM authentication and successful exclusive output creation. Only attempt private-key cleanup after authenticated output has been fully written, flushed, and closed successfully. Do not leave partial plaintext on any failure path. Specify and test whether a timed wait holds the receiver process open and how the user safely reads the file during that interval.
- Review the user's `securefiledelete.png` routine and its reported production/raw-hex testing as user-provided evidence. Port or adapt only after code review; test overwrite/write-through behavior on documented Windows configurations, preserving safe path, reparse, ACL, and race protections. Any `FILE_FLAG_NO_BUFFERING` use must honor documented alignment constraints. Do not treat `FILE_FLAG_OPEN_REPARSE_POINT` as an erasure control.
- An optional VSS/snapshot probe is advisory only: report detected supported snapshots, state that no detected snapshot is not proof of absence, and do not require elevation or fail decryption solely because snapshot status cannot be determined. Document that third-party snapshots, backups, sync, paging, SSD remapping, and copies outside the receiver are not verified.
- Update `plan.md`, receiver/privacy documentation, and meaningful tests before implementation/release. Exercise cleanup success/failure/cancel/timeout, wrong-key/tampered input, read/output failure, static-key preservation, explicitly selected one-time-key cleanup, and file-format preservation. Independent review assesses the cleanup claim and actual OS calls; passing tests do not establish universal sanitization.

### FUT-08 — restore app-produced SVG only after fuzzing and review

Type: story · Priority: P2 · Status: Deferred · Milestone: v1.1 · Dependencies: EXP-02, SYM-02, QA-03.

Acceptance criteria:

- Add a separately specified strict inert grammar for known S64SVG1 strip/page exports, cap each file at 16 MiB/recovered raw at 88,102, and validate pinned paths/IDs/counts/coordinates/metadata/checks and complete nonoverlapping page coverage. Never render/execute imports or fetch references.
- Reject DOCTYPE/entities/parser errors, script/foreignObject/style/animation/filter/image, event attributes, foreign namespaces/external URLs and all out-of-grammar elements/attributes. Token order determines raw; metadata cannot override it. No regex-only extraction shortcut.
- Property-based generation/mutation plus coverage-guided parser fuzzing include depth/size/resource limits, namespaces/entities/duplicate IDs/path encodings/transforms/order/count and parser differential corpus. Demonstrate zero induced execution/networking, fail closed on inconsistencies and localize page/row errors.
- Independent security review with no unresolved critical/high parser findings precedes enabling SVG import. Existing v1 raw recovery remains available; this task is not an M5 dependency.

Subtasks:

- [ ] FUT-08.1 — define allowlist/normalization/resource contract and implement an isolated inert parser.
- [ ] FUT-08.2 — build property-based/coverage fuzz harness and hostile/differential corpus.
- [ ] FUT-08.3 — obtain independent parser review, recheck fixes and release as an explicit v1.1 feature.

Deferred items do not block M5 and have no implied authorization to change the compatible envelope, private-key policy, or message persistence.

## 15. Current evidence and open gates

| Item | Current evidence / next action |
| --- | --- |
| Planning and repository docs | `plan.md`, `backlog.md`, `AGENTS.md` maintained from references and linked primary documentation; GitHub README and .gitignore added; source assets preserved |
| Documentation validation | 2026-10-03: four Markdown documents, local links/anchors/fences, 35 story/enabler definitions with AC/priorities/statuses, revised dependency existence/acyclicity, five envelope size formulas and two artwork-layout calculations checked; 52 .gitignore cases checked with Git in an isolated temporary test repository; zero issues. At the original planning baseline application checks had not run; subsequent implementation evidence is recorded below and in docs/status.md |
| Engineering | EN-01/02/03, KEY-01/02/03, CRY-01/02/03, UX-01/02/03.1, REC-01/02 and SYM-01/02 Done; EN-04.1 Done; EN-04 in progress; UX-03/EXP-02/03/04 Done; E06/M3 and EXP-01 Review pending actual Gmail/Outlook paste; REC-03 Review pending operator/novice evidence. M0/M1 development gates complete. REC-04 optional one-message key lifecycle and best-effort output/key cleanup is in the backlog and is not implemented. Current evidence and later gates: [docs/status.md](docs/status.md) |
| Sharing decision | Confirmed: copy/save PNG artwork for email plus raw ciphertext; full SVG/PNG/print all use the S64M1 mixed view; Unicode symbol strings deferred |
| Production recipient | Operator-confirmed RSA-4096 public PEM/name/full fingerprint configured; production build/browser checks pass. Operator backup/readiness, independent integrated review and signed release remain open. |
| Host/domain | Vercel primary; user proposes free zodiac-modern.vercel.app and will not buy a domain. Origin availability/control/deployment and publisher/channel/owners remain pending. Fresh generated static output tested; no deployment. Alternatives in docs/deployment.md |
| Independent review | User-supplied REC-01 conditional approval recorded; specified fixes pass native/synthetic verification and all mandatory evidence gates. Reviewer identity/tool was not supplied and no external post-fix execution is claimed. QA-03 integrated review remains open. See docs/reviews/2026-10-03-rec01-followup.md |
| Review feedback | EN-04 file:// spike/conditional launcher; raw-primary vs optional artwork/no v1 SVG consumer; complete compact PNG distinct from archival pages; REC-01 owned fixed-profile stdlib loader replaces third-party decoder selection, with youmark/pkcs8/.NET read-only references and strict parsing/fuzz/vendor gates |
| Offline artifact trust | Independent artifact hash/reviewer channel needed for REL-03; hashing and locality do not by themselves establish code trust |
| Receiver decision | Confirmed: browser encryption plus downloadable offline Go decrypt CLI, encrypted OpenSSL keys and hidden prompt; supersedes the earlier offline-browser selection |
| Receiver/signing gates | REC-01 focused conditional approval and verified fixes, exact LF fixture/oracle, native boundary/mutation/prompt, fuzz/resource/latency and complete vendor evidence pass. Workflow remains a template. REC-02 Windows output is implemented/tested; QA-03, signing and independent release channel remain pending |
| Offline sender decision | EN-04 bundled sender/glyph/raw/printed-row recovery/SVG/PNG/JSON/print/runtime notices pass Chromium/Firefox and stable Edge; stable Chrome/Firefox/headed independent verification/review and release selection remain open. Native sender launcher/signing remains conditional |
| Local repo use | pnpm dev/build/start:local/local and custom-only scripts implemented. Production builds require real public configuration; REL-04 final installation/hosting documentation gates remain open |
| Security claim | Passing synthetic implementation tests and provisional external feedback; no proof/certification/completed audit/production validation claimed |

Earlier implementation snapshot (superseded by the status evidence below): EN-01 | Done | `src/`, package/config files and scripts | seven unit tests, zero type diagnostics and 12 passing Chromium/Firefox checks | author verification | scaffold complete; later product flows and release remain separate. EN-02/EN-03 | Review | `tests/interop/`, `tests/browser/`, recipient scripts | real Chromium/Firefox interoperability, fail-closed build tests | author verification | REC-01/KEY-01 gates remain. REC-01 | Review | `receiver/` and fixture manifest | native tests, real OpenSSL oracle, initial 30-second pre/post fuzz and full vendor verification | user-supplied review plus author checks | post-fix focused review open; CI template retained by user instruction; expanded seeds/local regression gate pass. EN-04 | In progress | `offline/` | bundled synthetic probe, Chromium/Firefox file:// tests | author verification | full-flow/stable-platform/review evidence open.

Status evidence:

- REC-01 | 2026-10-03 | Done | current exact files/hashes in docs/reviews/rec01-evidence.json | complete OpenSSL/native/vendor/fuzz/resource gate plus native console evidence | external focused report relayed by user; conditional approval and verified fixes in docs/reviews/2026-10-03-rec01-followup.md | Windows tested; other terminal platforms experimental; QA-03/release pending.
- EN-02 | 2026-10-03 | Done | tests/browser/interop.spec.ts and tests/interop/go | real Chromium/Firefox WebCrypto and independent Go oracle pass; REC-01 dependency gate satisfied | author verification | integrated system review pending.
- KEY-01 | 2026-10-03 | Done | src/lib/crypto/public-key.ts and tests/browser/public-key.spec.ts | native SPKI/actual integer policy, cross-runtime fingerprints, strict negative corpus pass | author verification | release trust/custody remains separate.
- KEY-02 | 2026-10-03 | In progress | RecipientSelector.svelte and tests/browser/recipient-selection.spec.ts | local file/paste, rejected replacement, clear/default/reload, public export, keyboard/privacy/CSP pass | author verification | encryption/result snapshots and new-message integration pending.

- CRY-01/CRY-02/CRY-03 | 2026-10-04 | Done | src/lib/crypto, codecs, validation, workspace; tests/unit and tests/browser | 14 unit tests; 30 real Chromium/Firefox cases, independent Go/actual command, fresh values/nonextractable AES/cleanup, strict offsets/limits and lifecycle races | author-run; relayed compatibility feedback recorded separately | no formal proof/audit or release claim; docs/reviews/m1-review-packet.md.
- KEY-02/UX-01/UX-02 | 2026-10-04 | Done | RecipientSelector/EncryptWorkbench, local CSS | default/custom/busy/result snapshots, exact composer, IME/keyboard/retry/reset, capability refusal, measured light/dark contrast, 320px/200% text zoom/print/CSP/privacy | author-run | independent AT/system review remains QA-03; production recipient remains a launch configuration gate.
- UX-03 | 2026-10-04 | In progress | EncryptWorkbench, exports/ciphertext.ts | raw result/profile/checksum, exact copy/download/manual fallback, another-message/clear/navigation lifecycle pass | author-run | full display and SVG/PNG/print artwork actions depend on M3; do not mark entire story Done.
- UX-02/UX-03/SYM-01 follow-up | 2026-10-05 | Implemented, verified | auto display, collapsed key controls, composer/action ordering, paging scroll and pnpm 4324 preview commands | 29 unit/44 Chromium-Firefox cases, stable Edge offline case, production CSP and snapshot refresh | author-run; docs/reviews/sender-layout-evidence.json | recipient readiness, E06 exports and independent release review remain separate.
- REC-02 | 2026-10-04 | Done (Windows scope) | receiver/internal/envelope, localfile, cmd/zodiac-decrypt | native RSA/GCM/UTF-8/tamper/unwrap tests; protected ACL/private exclusive output, actual parent mutation/swap/alias/link/cancel/failure tests; both actual browser/hidden-console command runs | author-run | unsigned; other OS filesystem operations fail closed; new integration awaits QA-03, not covered by prior REC-01 focused verdict.
- E05/SYM-01/SYM-02 | 2026-10-05 | Done (development) | src/lib/symbols, codecs/recovery.ts, SymbolPlate/RawRecovery and docs/glyph-map-manifest.json | 26 unit and 42 Chromium/Firefox cases; 64 pinned vectors/licenses, 512 preview/maximum result, native 24/16 px and print legend review, exact raw/transcribed rows/Go/CSP/privacy; stable Edge file:// case passes | author-run; docs/reviews/e05-evidence.json | no human transcription error-rate measurement, completed export/print artifact QA or integrated audit.
- EXP-04 | 2026-10-05 | In progress | src/lib/export/checks.ts, codecs/recovery.ts and RawRecovery | independent S64CHECK1 vectors, external metadata helpers, early row localization/context/ordered assembly/final digest pass | author-run; E05 record | generated artwork/print labels and metadata integration remain E06.
- REC-03 | 2026-10-05 | Review | receive guide, crypto/readiness.ts, scripts/test-recipient-readiness.ps1 | fresh browser token/native Go round trip plus both real hidden-console original/restored helper trials and existing-folder refusal pass | author-run; docs/reviews/rec03-helper-evidence.json | operator's real backup/readiness and observed first-time user outcomes pending; release signing/publisher/QA-03 remain separate.
- SYM-01.4 | 2026-10-05 | Done | symbols/mixed-view.ts, s64m1-paths.ts, SymbolPlate and mixed-view-manifest.json | 29 unit/42 Chromium/Firefox cases, stable Edge file://, exact raw/null exclusion/global rotation/maximum preview and production artifact/CSP checks pass | author-run; docs/reviews/mixed-view-evidence.json | outline only by user choice; original S64L1/check/receiver contracts unchanged; SVG/PNG/print remain E06.

- E06 / M3 | 2026-10-06 | Review | complete/page PNG, full S64SVG1 strip, metadata, request-only checked archival A4/Letter print and offline exports | 34 unit tests/54 Chromium-Firefox cases, stable Edge file://, production CSP and exact PDF-row/Go recovery pass | author-run; docs/reviews/e06-evidence.json | actual Gmail-primary/Outlook-secondary unsent draft paste remains EXP-01.3; independent QA-03/signing remain separate.
- S64M1 correction | 2026-10-06 | Done | null rotation corrected to CircleOff/CircleDashed/Skull; original Crosshair payload for j restored in the mixed view | full M3 regression and frozen provenance pass | author-run | earlier development mapping was contrary to user correction; no released S64L1/envelope/check geometry changed.
- EXP artwork consistency | 2026-10-07 | Implemented; focused verification passed | all art outputs use S64M1; archival print omits title/attribution/recovery footer, masks recipient fingerprint, and retains checked raw rows with a small profile/key-size label left of the page number | 5 export unit tests, 10 Chromium/Firefox export cases, extracted A4/Letter PDF checks and production preview refresh pass; full M3 gate remains unrerun because Prettier cannot scan a locked .cache path | user-directed; raw ciphertext and S64CHECK1 values unchanged.

- E07 / M4 | 2026-10-06 | Review | config/security-policy.ts, release-trust.json, artifact/dependency/provider/external verification scripts, public guidance and hardening/privacy browser tests | pnpm check:m4: frozen installation, real OpenSSL/Go/vendor/fuzz, 37 units/64 Chromium-Firefox-WebKit cases plus stable Edge, exact PDF/Go recovery and clean Vercel static output; docs/reviews/e07-evidence.json | author-run; integrated reviewer pending | SEC-02 receiver OS network-denial trial, SEC-04 undecided trust anchors, QA-01 full shipping CLI/attack matrix and CI publication, QA-02 human/device/email trials, EN-04 final delivery selection and QA-03/release stay open. No deployment or signing performed.
- E08 / M4 | 2026-10-06 | In progress | tests/browser/bridge.ts and interop.spec.ts, optional Playwright WebKit project, inactive workflow template | Full M4 check passes 37 unit/62 Chromium-Firefox cases; focused post-splice interop passes four cases across both browsers/sizes; Go/WebCrypto directions, receiver-command test seam, OpenSSL/vendor/fuzz/build/PDF/host checks pass; docs/reviews/e08-qa-matrix.md | author-run only | QA-01 local matrix complete; published CI stays open by operator choice. Assistive-technology/reference-device/five novice/Gmail-Outlook trials and integrated independent review remain. Hidden-terminal receipts cover Chromium/RSA-3072 and Firefox/RSA-4096 only. WebKit is optional.
