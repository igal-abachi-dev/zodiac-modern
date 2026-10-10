# EN-04 early feasibility evidence

The prototype now mounts the actual Svelte sender. It shares RecipientSelector,
Workspace, strict native WebCrypto, codecs and raw exports with the Astro site.
The build compiles Svelte islands with external CSS, bundles JavaScript as one
IIFE, and embeds CSS/public configuration/help into one HTML file. It has no
adjacent-file, runtime import, remote font or network dependency. Frozen glyph
display, its legend and local raw recovery are included. SVG/PNG/JSON downloads and request-only archival print are now included and tested by E06.

The exact fixture artifact size/hash is recorded in the refreshed E06/E07 machine evidence. Chromium and Firefox open it
directly through file:// from a path containing spaces and Hebrew characters.
Tests exercise both sizes, configured key initialization, public file/paste
replacement, exact UTF-8, independent Go decryption, raw download/manual-copy
fallback, new-message/reset, no requests/storage/style attributes and no CSP/runtime
errors. The installed stable Edge 154.0.4258.53 channel also passes the expanded
mixed-view/raw-recovery/export/print case. S64M1 includes actual literal payload characters,
sparse mirrors/180° rotations and rotating non-payload nulls; exact raw exports
and independent Go recovery still pass. Hosted printed-row validation/reassembly passes Chromium and
Firefox, including complete bundled printed-row validation/reassembly. Stable Chrome and stable Firefox installations, headed Windows usability,
external independent verification review and actual email draft paste still require evidence.
Browser tests enable the Chromium process sandbox
and never relax file access, WebCrypto or CSP policies.

The first full Svelte bundle exposed a JavaScript replacement-string issue:
replacement `$` sequences changed executable bytes after hashing. Placeholder
insertion now uses callbacks, embedded blocks normalize line endings before
hashing, and tests independently recompute hashes from the final HTML. CSP meta
precedes code and enforces hashed scripts/styles, no style attributes, connect,
workers, objects, forms or base URLs. Meta CSP cannot enforce HTTP-only
frame-ancestors/HSTS/nosniff; independent review of that local boundary is pending.

Verify full release HTML bytes **outside the file before opening it**, using a
hash obtained through an independently trusted publisher channel:

```powershell
& .\scripts\verify-sender.ps1 -Path 'D:\Verified Sender\zodiac-sender.html' -ExpectedSHA256 'FULL_64_CHARACTER_TRUSTED_HASH'
```

The helper does not open the file. Missing/invalid/mismatched hashes refuse;
the regression alters a file and confirms rejection. A checksum beside the HTML,
same-site download or a badge inside the page does not establish publisher trust.

The self-contained file also carries complete notices for its actual browser
runtime (Svelte, Lucide, clsx and esm-env); no adjacent license file is required.
Shared policy generation now supplies HTTP and file hashes, and the full-flow
tests check the final emitted notice content too.

EN-04.1 is implemented as the early prototype. EN-04.2/.3 remain open: remaining stable support matrix, actual email paste, independent boundary and
verification UX review, measured complete-flow costs, then the delivery choice.
This evidence does not select a launcher or make the prototype a release.

## 2026-10-10 automated follow-up

The fresh synthetic HTML candidate is 173,379 bytes, with SHA-256
`a87bfc16e561bb94a74839f51831c1d9b5eb37e59be0763991a9a09497f84284`.
This identifies a synthetic development fixture, **not a reviewed release hash**.
Candidate build time was 1.67 seconds on Windows 10.0.26200, Ryzen 9 5900X,
approximately 32 GiB RAM and Node 24.21.0. The shared build consumed 4,145
esbuild input modules (including tree-shaken package sources); it does not
maintain a separate crypto or export implementation.

All three automated full-flow cases passed with both RSA sizes: bundled
Chromium 153.0.8010.12, bundled Firefox 155.0, and installed stable Edge
155.0.4283.45. Each checked exact WebCrypto-to-independent-Go recovery,
file/paste public imports, raw/SVG/PNG/JSON downloads, mixed print payload
and null counts, manual clipboard-denial fallback, raw/printed-row recovery,
reset, zero HTTP requests, empty storage and no runtime/CSP errors.
The print dialog is stubbed; actual printing and human usability are not
claimed by this run. Stable Chrome/Firefox are absent from the checked
Windows paths/registry and remain required before release selection.

| Phase                         | Chromium | Firefox | Stable Edge |
| ----------------------------- | -------: | ------: | ----------: |
| File open and initial render  |    69 ms |  222 ms |       98 ms |
| Encrypt and render, RSA-3072  |   102 ms |  362 ms |      105 ms |
| Encrypt and render, RSA-4096  |    83 ms |  142 ms |       79 ms |
| Complete PNG, RSA-4096 sample |   159 ms |  166 ms |      217 ms |
| Printed-row reassembly        |   185 ms |  283 ms |      182 ms |

These are one sample per phase using a short synthetic UTF-8 message,
including automation, waiting and download overhead. They are not native
crypto benchmarks, percentile/maximum-size measurements, long-task results,
mobile qualification, or an observed user trial. Exact measurements and
validation source hashes: [machine evidence](en04-automated-evidence.json).

Final embedded block hashes, restrictive meta CSP, no adjacent runtime assets
and static artifact checks passed. The normal PowerShell external verifier
accepted the matching HTML from a space/non-ASCII path and rejected altered
HTML and wrong/invalid hashes; no file was opened by the helper. Initial
sandbox execution was blocked by its PowerShell policy; the successful run
used the normal outside-sandbox environment without changing execution policy.

Repeat from a normal Windows context:

```powershell
pnpm check:offline
pnpm test:offline
pnpm test:offline --stable-edge
pnpm test:offline --stable-chrome
```

Stable Firefox requires a separate supported automation harness or observed
manual run: Playwright relies on its patched Firefox and cannot validate an
installed branded Firefox merely by changing `executablePath`. See
[Playwright browser support](https://playwright.dev/docs/browsers#firefox).

The browser runner rebuilds the synthetic candidate and independent Go oracle,
records timings in the JSON test report, disables traces/video/screenshots,
and restores the previous generated recipient configuration. It starts no
HTTP server and never relaxes browser security flags or CSP. A `--headed`
run can support a later observed usability trial, but automation alone
does not establish usability or independent review.

The fully bundled HTML remains the preferred **conditional candidate**.
Stable-browser, headed usability, independently trusted verification and
file-boundary review gates still precede the final delivery decision. No
native launcher, signed release, publisher/channel choice, or deployment
was selected by these automated checks.

## Stable-channel automated follow-up (2026-10-10)

The same 173,379-byte synthetic candidate passed the headless offline flow in
**official stable Chrome for Testing 155.0.8059.39** and **stock stable Firefox
157.0.1**, isolated under the workspace cache. Normal browser installations
and user profiles were not changed. Firefox's extracted executable has a valid
Mozilla Corporation Authenticode signature; the official Chrome for Testing
executable is unsigned. Package URLs, observed versions, package/executable
hashes, source hashes and phase measurements are recorded in
[stable-browser evidence](en04-stable-browser-evidence.json). These are provenance
records for development tests, not independently authenticated release hashes.

Both RSA sizes passed file/paste key imports, fingerprint confirmation, native
WebCrypto encryption and exact independent Go decryption, raw/SVG/PNG/JSON
exports, mixed print payload/null counts, clipboard-denial fallback, reset and
raw/printed-row recovery. No page HTTP requests, runtime/CSP errors, style
attributes or local/session storage were observed. Firefox uses stock Mozilla
WebDriver/BiDi, with CSP monitoring installed before navigation; it does not
relabel Playwright's patched Firefox as a stable installation. Print is stubbed,
clipboard denial is synthetic, and measurements include automation overhead.

With official browser packages extracted locally, rerun:

```powershell
$env:ZODIAC_STABLE_CHROME_EXECUTABLE = (Resolve-Path .cache/stable-browser-check/chrome-win64/chrome.exe).Path
pnpm test:offline --stable-chrome --project=stable-chrome
pnpm test:offline:firefox
```

The Firefox harness defaults to the recorded cache paths; override
ZODIAC_FIREFOX_BINARY and ZODIAC_GECKODRIVER for other explicit local binaries.
It does not download or install them. Drivers use loopback ephemeral ports and
fresh temporary profiles; only processes started by the harness are stopped.
The runner restores the generated default-recipient file after fixture builds.

This closes the missing **automated stable-channel** coverage. Normal installed
Chrome/Firefox headed save/clipboard/print UX, human/AT usability, reference-device
and maximum-size/long-task qualification, externally denied networking, independent
file-boundary/hash-instruction review and final delivery selection remain open.

## Maximum-size and receiver follow-up (2026-10-10)

[Qualification evidence](en04-qualification-evidence.json) records passing
64 KiB single-line mixed-UTF-8 encryption and independent Go recovery with both
RSA sizes in bundled Chromium/Firefox, stable Edge and stable Chrome for Testing.
Keyboard confirmation/focus/reset, oversized rejection and 1280/390 px paging
checks passed. This is desktop automation, not an actual mobile or human trial.
Encrypt-to-first-page samples ranged from 49.5 to 172 ms on a Ryzen 9 5900X
desktop. Chromium-family runs observed individual 62–69 ms long tasks; Firefox
did not expose the Long Task API. These are single samples with automation
overhead, not reference-device qualification or crypto benchmarks.

The opt-in `ZODIAC_QUALIFICATION_MULTILINE=1` case timed out during native
Playwright filling of 5,041 bidirectional-text lines, before encryption. Its
cause remains unconfirmed. Keep this input-usability investigation open; the
passing single-line control does not resolve it.

Fresh offline vendor-mode receiver tests passed on Windows with the pinned
Go 1.27.1 toolchain and synthetic files on workspace NTFS. Cleanup tests passed,
and the snapshot advisory detected three exposed shadow-copy device names.
This is not proof of physical erasure or additional-platform qualification.
Administrator-enforced network denial remains pending: this process is not
elevated, and no firewall rules were created.

## Multiline native-input investigation (2026-10-11)

[Diagnostic evidence](en04-input-investigation.json) narrows the prior timeout:
Firefox passes the exact 64 KiB, 5,042-line message through both RSA sizes and
independent Go recovery. Stable Chrome for Testing times out in native fill
before encryption, and a plain textarea without Zodiac code also times out
with both automatic and fixed LTR directions. Timeout location varies between
initial input and bulk replacement. Append/backspace size-boundary editing does
not resolve the initial-fill case. The opt-in native control is skipped during
the ordinary regression suite and must not be counted as a passing check.
Real paste/installed-browser usability and the exact browser/automation cause
remain unverified. No product text-direction or Unicode changes were made.
