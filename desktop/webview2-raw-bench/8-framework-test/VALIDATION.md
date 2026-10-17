# Implementation validation — 2026-10-17

All nine apps are implemented and production-built. **All nine pass current
integration checks after the explicit htmx offline no-storage patch.**
The external Windows collector and initial nine-app performance cohorts are now
complete: **900 primary + 210 supplemental passing attempts**. See the
[measured tables](results/2026-10-17/RESULTS.md),
[source-aware interpretation](results/2026-10-17/INTERPRETATION.md) and
[collector endpoints and limits](measurement/README.md). Five analysis regressions
and the C# stale-ancestry/PID-reuse fixtures pass. Earlier rejected collector
cohorts remain retained; they were not counted as framework failures.

| Candidate | Type checks / production assets | Real WebView2 | Installed-Edge keyboard suite |
| --- | --- | --- | --- |
| Vanilla | Pass | Pass | Pass |
| Svelte | Pass, zero Svelte warnings | Pass | Pass |
| React | Pass | Pass | Pass |
| Vue | Pass, including vue-tsc | Pass | Pass |
| Solid | Pass | Pass | Pass |
| Lit | Pass | Pass | Pass |
| Preact | Pass | Pass | Pass |
| Alpine CSP | Pass | Pass | Pass |
| htmx 2.0.11 + patch | Pass | Pass | Pass, including pre-initialization storage-write observation |

Nine shared unit tests passed: legal transitions/immutable snapshots, elapsed-time
progress/stale callbacks, cancellation during notification, Nano Stores subscriber
semantics, the bounded style policy, supplemental workload fixtures/disposal,
diagnostic sanitization/bounds, shift windows and explicit blocking intervals.
All nine have identical common CSS/font/
icon assets. The asset audit passed MIME/size checks, no inline executable HTML,
and exclusion of correctness instrumentation from production JS.

## Tools and local evidence

Node 24.21.0, pnpm 12.8.1, Vite 8.3.4, TypeScript 6.0.3, Nano Stores 1.5.5 and
Zag 1.45.0. Exact framework/Ark/plugin versions are in the workspace lockfile.
TypeScript 7 was not selected because the pinned Svelte checker supports 5/6.
Install scripts were disabled, including explicit disallow rules for esbuild and
Parcel watcher. The optional packaged binaries worked without those scripts.
An offline install with the populated store passed. Notices/license texts were
inventoried for 300 installed packages; this is not a dependency or legal audit.

The unchanged clang-cl/Ninja Release host has SHA-256
`4AE49ADC08D33CD0F590A6FAA3EE8AE2C6EEF309D307AD29ABBCAA3DFF7C0928`.
Original native reports record WebView2 Runtime **155.0.4283.45**. The newer
primary recheck (`host-d27ff...`), supplemental workload (`host-9f407...`) and
final diagnostic (`host-61d46...`) reports all record **155.0.4283.60** for every
candidate. Treat these as separate runtime cohorts; do not mix their timings.
The Release host hash is unchanged. Re-freeze the actual runtime before the
any new performance cohort rather than assuming Evergreen remains constant.
Shared CSS SHA-256:
`d1cd2490c8c5d2c6cec0b4a46d88f6b7ab2600c631a70651f7163ec0aecae44d`.
Lockfile SHA-256 at the artifact audit:
`cf8063a9c90ec26ebd7be99c17bfa87733af062ccc6a598f765e76ccf8e86ddc`.

These replace the earlier pre-patch/CSS-source-freeze hashes; historical reports
retain the hashes they actually tested. Current manifests record the patch hash.

Ignored evidence remains locally under `.cache/`:

- `typecheck.log`, `unit-tests.log`, `build-production.log`, `build-test.log`.
- `manifests/*.json`: source/asset/lock/host hashes, versions and raw bytes.
- `host-41e2dd2d310e42f08b8ded4fd9e31a5a/results.json`: eight native passes,
  one htmx failure. Successful cases include helper exit within 30 seconds;
  per-app numeric JSONL reports retain runtime and host settings.
- `browser-production-final.log`: historical eight production installed-Edge
  passes and the unmodified htmx storage failure. `browser-results.json` now
  contains the new nine-pass production run after the explicit patch.
- `htmx-debug-final.log`: instrumented diagnostic names the failed storage check.
- `host-ba6943fcc4d04919a94cc0b3a14d5371`: focused visible vanilla pass.

Earlier failed pilots remain separate. Hidden WebView2 timed out on focus checks;
visible tests were necessary and now form the native interaction evidence. A
PowerShell stderr-handling issue, dependency-JSON BOM, unstable control IDs and
formatting-sensitive Unicode fixture whitespace were corrected. Fixture text now
comes from the same shared string in every app. No pilot failure is counted as
successful acceptance.

## Approved style composition

Ark public hooks/prop APIs and Zag adapters retain focus trapping, Escape, outside
dismissal and focus return. Each renderer composes the same native `inert`
background and external-CSS overlay. Body-style pointer blocking and scroll lock
are disabled. No fork, CSSOM monkeypatch, native bridge or host change was used.

The user explicitly approved only `--layer-index: 0`, `--nested-layer-count: 0`
and `pointer-events: auto` on
`#about-content[data-scope="dialog"][data-part="content"]`. No body styles,
other values, priorities, geometry, colors or injected stylesheets are accepted.
Tests inspect observed prior/current values and final DOM. The host CSP is
unchanged; this narrowly supersedes the former absolute no-style-attribute rule.

## Original htmx finding: failed before the explicit patch

Pinned htmx **2.0.11** calls `setCurrentPathForHistory` during module evaluation
and writes `sessionStorage['htmx-current-path-for-history']` when storage is
available. `historyEnabled: false` and `historyCacheSize: 0` do not guard this
initialization. The production keyboard test reaches its final storage assertion
and observes one session key instead of zero. No fixture or secret is stored by
this observed path, but it violates the selected contract.

The native smoke also fails; its content-free report does not expose assertion
text. The corresponding instrumented Edge diagnostic identifies the storage
assertion. This is combined diagnostic evidence, not a claim that native reports
contain the error text. Official 2.0.10 and 2.0.8 archives were inspected read-only
and contain the same initialization write; neither was installed or substituted.
Current source: `apps/htmx/node_modules/htmx.org/dist/htmx.esm.js`.

At that stage no key deletion, monkeypatch, library patch or persistence waiver
was used. The unmodified variant remains a failed finding. The user's subsequent
instruction to fix the failure led to the explicit patched variant below.

## htmx fix and supplemental workload validation

`patches/htmx.org@2.0.11.patch` changes only the imported ESM history-storage
capability helper to return false without probing. pnpm records the patch in its
workspace configuration and lockfile. This is an offline no-storage build,
not a claim that upstream 2.0.11 now passes unchanged. No cleanup-after-write or
browser Storage API override ships in the app; no host/CSP change was needed.
See [patch rationale and maintenance limits](patches/README.md).

All nine production Edge tests now pass, including a pre-module observer for
`Storage.prototype.setItem` calls before reload and again after reload. Empty
storage alone would miss transient probes. The nine visible native-host tests
also pass, including htmx and the profile-helper exit gate:
`.cache/host-d27ff24119354376a67987d9ac7c6b91/results.json`.
The focused htmx confirmation is
`.cache/host-f8bc4eab33d74eefb9477422f9a814b0/results.json`.

All nine supplemental renderer correctness tests pass in installed Edge with
the enforced CSP (`.cache/workload-correctness.json`). They check 1,000/10,000
rows, keyed reversal, replacement IDs, filtering while updates run, multilingual
input, five fresh-store panel remounts, stale timer isolation and five original
dialog/action cycles. Workload builds remain separate `dist-workload` outputs.
All nine also pass visible native workload checks using `dist-workload-test`:
`.cache/host-9f407704d0584b96b1b0470708f8cef2/results.json`.
Native checks verify keyed identity, synthetic input/filtering, 10,000 rows,
five fresh-store panel remounts, timer isolation and helper shutdown in addition
to the existing primary CSP/control checks. Synthetic event dispatch does not
replace the browser's sequential keyboard test or physical IME/AT acceptance.
The primary native lane still uses `dist-test`.

Full workspace type checks pass, including Svelte with zero warnings. Nine unit
tests pass. Production/test/workload builds pass, and the production artifact
audit excludes workload/test markers. Tailwind now scans explicit production
sources so research text/test additions cannot change CSS. This removes 55 bytes
of accidental utility output relative to the first snapshot; the other eight
production JS sizes are unchanged, while patched htmx saves 110 JS bytes.

## Opt-in diagnostic collection

Separate diagnostic and workload-diagnostic builds now register bounded,
sanitized browser observers. The nine installed-Edge correctness probes pass
(`.cache/diagnostic-correctness.json`): supported/unsupported registration,
buffered FCP where available, snapshot shape/bounds, stopping/disconnect,
no Web Storage or remote requests, and no CSP errors. Unit tests validate shift
session windows, clipped long-task intervals and exclusion of DOM/URL/text data.
See [DIAGNOSTICS.md](DIAGNOSTICS.md) for schema, commands and interpretation.

Correctness probes observe timing entries to validate browser collection. They
are separate from the now-published external performance cohorts and do not
supply hardware presentation or a universal ranking. Production bytes/CSS and the native host are unchanged; the
artifact audit rejects diagnostic/workload markers in primary JS. Native exports
of full browser JSON and physical display capture remain pending. The separate
external harness now supplies its OS-clock/UIA/client-frame and process-resource
records. The diagnostic lane uses the existing
fixed pass/fail host channel, with no generic IPC or DevTools relaxation.

All nine visible native diagnostic checks pass too:
`.cache/host-61d46ca217a645f6a50523296655b97b/results.json`.
The diagnostic build must have loaded the collector; native checks explicitly
require it, verify paint-observer support/buffered FCP, finite bounded entries,
explicit stop/disconnect and stable entries after stopping, then complete the
host's blocked-resource/navigation and helper-exit checks. This strengthens the
earlier diagnostic pilot whose collector check was conditional on API presence.
Neither pass/fail report exports native timing samples for ranking.

## Remaining scope

Startup, process-tree private memory/CPU and semantic control/list response have
now been measured in the linked cohorts. GPU/frame pacing, energy, post-reboot
OS-cold and physical input-to-paint remain unmeasured. See
[CODE-COMPARISON.md](CODE-COMPARISON.md) for source and artifact insights.
Narrator/NVDA, physical DPI/multi-monitor/RTL acceptance, process-aware network/
storage traces, long soak testing and independent review remain pending. Edge
keyboard/media-emulation checks supplement native testing; they are not complete
Windows accessibility acceptance. The host's known intermittent early-initialization
helper-shutdown issue remains open. No Go, crypto, router or native bridge was
added. Broader stress/navigation/bridge scenarios remain future work.
