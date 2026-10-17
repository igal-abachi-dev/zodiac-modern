# Measurement protocol

## Current execution status

The user authorized external collection and the nine-app runs. The implemented
[Windows harness](measurement/README.md) passed 18 pilot attempts across vanilla,
Svelte and React. Cohort `.cache/benchmark-20261017-c` stopped on a UIA provider
disconnect during an htmx diagnostic pair; all 52 attempts remain retained. The
collector now records/retries bounded provider disconnects. The new frozen pilot
(`benchmark-20261017-d`, runtime 155.0.4283.60) passed 18/18, including one recorded
provider recovery. It then stopped during warmup after stale parent-PID reuse
incorrectly attributed unrelated older processes. Those 57 attempts are retained;
the host/apps were not changed. Creation-time ancestry checks and regression
cases now pass. Replacement collector `benchmark-20261017-e` passed 18/18 pilot
attempts and completed all **900 primary attempts**. The separate list/input
collector (`workload-20261017-g`) completed **210 attempts**. All accepted attempts
passed: 720 measured startups (36 conditions × 20), 45 idle-state conditions,
20 control cycles per app, and 81 supplemental operation conditions × 20.
See the [key tables and raw metadata](results/2026-10-17/RESULTS.md) and
[interpretation against source findings](results/2026-10-17/INTERPRETATION.md).
Broader physical-presentation, accessibility and extended-workload gates remain open.

The implemented lane times a new `-NoProfile` PowerShell process, not the
Explorer context-menu gesture. GDI captures foreground client pixels, not the
native caption or physical panel. UIA observes usable UI and input responses;
it does not supply hardware input-to-paint. Actual capture intervals, missing
endpoints and collector overhead must accompany the results. Supplemental
list/input builds remain separate from primary production startup assets.

## Agreed next steps — 2026-10-17

This was the gated sequence agreed before external collection. The initial
startup/resource/control and supplemental cohorts are now complete as recorded
above. Retain these gates for new collector versions and future experiments;
completion does not include unsupported physical or extended endpoints.

1. **Complete and validate external collection.** Capture process identities and
   full host/WebView2-tree private memory/CPU; OS launch timestamps; Windows UIA
   Ready with both action buttons enabled; and synchronized visible loading,
   blank/black-frame and complete-content evidence. Separate Explorer/PowerShell
   launch overhead from direct-host startup. State clock alignment, sampling
   overhead, presentation precision and unavailable metrics explicitly. Preserve
   helper-exit checks; leftover run-owned helpers invalidate clean-start samples.
2. **Freeze the cohort.** Record host/source/lock/asset hashes, the actual runtime,
   Windows/hardware, client size, DPI/zoom/refresh rate and power policy. The
   latest checks used WebView2 **155.0.4283.60**; older evidence used **.45**.
   Re-verify at run time and split/restart the cohort if it changes. Keep normal
   memory policy, decorated window and bridge off in the primary lane.
3. **Pilot vanilla, Svelte and React.** Exercise first/repeat launches, visible
   idle resources and one shared interaction workload. Check the trace against
   what is actually visible, including loading-to-black-to-content regressions.
   Retain raw pilot evidence and rejected samples. Pass the pilot only when
   event order, process attribution, readiness, capture and cleanup agree;
   report limitations rather than replacing missing endpoints with guesses.
4. **Measure all nine in randomized rounds.** Keep first-use, retained-path
   repeat, post-restart and launch-method conditions separate. Follow the sample
   counts and warmup rules below; retain the first/repeat diagnostic pair.
   Run startup/idle first, then separate list/input/dialog/action conditions.
   Keep uninstrumented production, supplemental and diagnostic builds separate,
   and identify htmx as the explicit patched offline variant. Correctness and
   policy failures remain failures, not entries removed to improve a score.
5. **Analyze the evidence before selection.** Report distributions and uncertainty
   for startup, input-to-visible response, idle/background/restore resources and
   lifecycle behavior, alongside accessibility and source/maintenance findings.
   Preserve absolute values and paired vanilla differences. Do not infer
   encryption speed from the simulated delay or collapse results into one
   universal framework score. Physical AT/IME/DPI acceptance remains a distinct
   product-selection gate.

The browser diagnostic collector alone covers only part of step 1. It does not supply
PowerShell/OS launch timing, hardware presentation, UIA integration, native full
JSON export or total process-tree resources. The separate external harness now
supplies the supported Windows endpoints and completed the initial cohorts.
Physical presentation and browser-entry native export remain separate. See [VALIDATION.md](VALIDATION.md) for
completed correctness evidence and [DIAGNOSTICS.md](DIAGNOSTICS.md) for limits.

## Frozen conditions and primary sampling

These nine apps implement the first router-free screen from the host plan.
The broader native-toolkit study's stress list, animated-vector, routing,
optional bridge and low-memory/suspension scenarios are separate work. Do not
substitute `dist-test`, Vite dev/HMR, hidden windows or self-test completion
titles for visible production measurements.

Freeze the source/lockfile, production asset manifests, common stylesheet/font/
icon hashes, Release host hash, actual WebView2 Runtime, machine/Windows build,
DPI, client dimensions, content zoom, display refresh rate and power state.
Use decorated/normal memory policy and no bridge in every primary run. Retain
the runtime installation/version throughout a cohort; Evergreen servicing can
otherwise change it between sessions.

The visible readiness endpoint is `role=status`, text **Ready**, after mount,
required font loads, image decoding, font settlement and two animation frames.
Both action buttons must be enabled. This is a usable-UI endpoint to observe
through Windows UI Automation, not proof of hardware scan-out or a first-paint
timestamp. Missing UIA visibility makes a sample unsupported; do not replace it
with an internal event in only one app.

Use the source plan's three warmups and 20 measured new-process launches per
variant/profile condition, randomized by round with one app at a time. Record
each raw sample, median/p95/minimum and variability. Retain each variant's
initialized profile for the retained-profile lane. First-use uses fresh isolated
profiles and forms a different group. OS-restart cold launch is another group;
neither a new process nor a new profile empties OS/disk caches.

## Launcher-to-visible-UI timeline

`Run.ps1` is an interactive launcher, not a performance collector. It starts a
host asynchronously and reuses `.cache/interactive/<app>` as the user-data path.
The per-app scripts add a wrapper invocation. Neither script currently records
these timestamps or waits for Ready. Do not time `init.cmd`: installation,
type checking and building are preparation, not application startup.

Keep two lanes: **Explorer / Run with PowerShell** for the user's end-to-end
experience, and **direct host executable** for the application comparison.
Keep the shell version, profile-loading policy and invocation identical across
apps. An already-open PowerShell terminal is a third launch condition, not an
equivalent substitute for Explorer starting a new shell.

| Marker | Definition and planned observation |
| --- | --- |
| Launch requested | Explorer launch action, when reliably captured externally; otherwise report the unavailable interval rather than infer it. |
| Shell started | OS process-creation timestamp for the PowerShell process, including wrapper relationships. |
| Host started | OS process-creation timestamp for the actual runner; distinguish it from the script's call to `Start-Process`. |
| Window visible | First captured frame with the target native window visible; HWND creation or `ShowWindow` is supporting evidence only. |
| Loading visible | First captured frame showing `Loading local interface…`, if that text is actually presented. Record absent if it is skipped between frames. |
| Content visible | First captured frame containing the expected heading, fixture, panels and controls with the intended CSS/fonts/icons. |
| Usable UI | UIA observes status **Ready** and both action buttons enabled; retain UIA polling interval and observation latency. |
| Stable complete frame | Expected complete content remains visible for three consecutive captured frames, including Ready. Record frame rate and capture uncertainty; this is a visual criterion, not proof all background work stopped. |

Capture the entire window from before launch through Ready and a fixed one-second
post-Ready observation tail. Prefer an external capture device for display-level
evidence, or a fixed-rate desktop capture with its overhead disclosed. Screen
capture establishes captured compositor output, not the exact physical panel
scan-out time. Correlate OS/process events and captures to a common monotonic
clock, report synchronization error, and preserve raw evidence. ETW/presentation
tracing can help attribute delays but does not identify correct UI content alone.

Treat blank, black, white or partially styled frames as **observed intervals**,
not a mandatory linear application state. A black frame may precede loading,
follow it, recur, or never appear. For each interval retain start/end frames,
duration, affected region (client area versus whole window), and a screenshot
with synthetic data. Separate intended dark surfaces from missing content by
checking the expected text/controls. Report total blank time, longest blank
interval and content-to-blank regressions. A single timestamp for Ready must not
hide a loading-to-black-to-content flash.

Report shell-to-host, host-to-window, window-to-loading (when observed),
host-to-content, host-to-Ready, and launch-to-stable-frame where both endpoints
are available. Loading and Ready observations need not arrive in the same order
across capture/UIA channels. Do not subtract timestamps from different clocks
without alignment, or claim sub-frame precision from video.

The host's environment/controller/navigation events help explain initialization;
they are not presentation timestamps. Microsoft's [navigation event
sequence](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/navigation-events)
distinguishes DOM parsing and content loading. Neither NavigationCompleted nor
the app's two animation-frame waits establishes that the intended screen reached
the display. Windows UIA collection and synchronized visual collection remain
planned; the existing correctness PASS title is not a startup endpoint.

## First launch versus second launch

Before the repeated cohort, retain a diagnostic **pair** for each app and launch
lane: launch once, close gracefully, verify all processes associated with that
run/profile exit within 30 seconds, wait a fixed five seconds after exit, then
launch again with the same settings and user-data path. Record both samples,
their order, the inter-launch delay and pre-launch process inventory. Do not
discard the first observation as a warmup: this pair specifically studies the
difference the user noticed. Two samples cannot establish a performance ranking.

Call these **first observed launch** and **repeat launch with warm OS caches**,
both with new host/browser processes when the exit gate passes. The first
observed launch is not necessarily OS-cold either. A separate controlled
post-restart first-launch lane is required for that question. Run fresh-user-data
pairs separately from retained-path pairs, with an explicit path per sample.
The host enables InPrivate mode; retaining a directory does not establish normal
persistent browser-cache reuse. OS file caches, loaded runtime code, font caches,
security scanning and shell initialization are possible explanations for a
faster repeat; record evidence rather than assigning a cause from elapsed time.

The installed Runtime does not mean every Windows app shares one running browser.
Microsoft's [process model](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-model)
ties process groups to user-data folders and compatible environment settings.
Record PID, creation time, parentage, runtime version and associated user-data
path; an unrelated `msedgewebview2.exe` is not evidence of reuse by this test.
If this run's helpers remain alive, record a lifecycle failure and invalidate its
clean-start pair. Any intentional live-browser reuse experiment needs its own
separate label. Do not kill unrelated Edge/WebView2 processes to make a machine
appear cold, or launch a second copy while the first is still running.

## Additional workloads and interpretation gates

Supplemental workload builds now exist in `apps/<app>/dist-workload`, separate
from both production `dist` and instrumented correctness `dist-test`. Build with
`pnpm build:workloads`; run the correctness suite with `pnpm test:workloads`.
They append a clearly labeled workload panel after the original screen. For a
manual host check, point the unchanged runner's `--assets` at that directory and
give it a separate profile. `Run.ps1` deliberately continues to launch `dist`.
Do not substitute supplemental bundle sizes/startup times for the primary lane.

Each renderer owns its supplemental list/input DOM. Shared fixtures and actions
live in `packages/bench-contract/src/workload.ts`; the test-only harness lives
in `packages/test-support/src/workloads.ts`. A new store is created on each
**workload-panel** remount. This does not test remounting the original screen's
terminal singleton. htmx's list remains an explicit client controller, not a
measurement of server-driven hypermedia. Lit uses light DOM. The simple native
search input is an auxiliary stress probe, not a replacement for Ark/Zag controls.

| Workload | Implemented scenario | What to collect later / remaining checks |
| --- | --- | --- |
| Keyed lists | Replace 1,000 or 10,000 deterministic Unicode rows; reverse; remove first ten/insert ten new IDs; immutably update every tenth row | State-to-present latency, scripting versus style/layout/paint time, DOM mutation/allocation counts; verify row identity and final data before accepting speed |
| Typing during updates | Search/filter the same list while bounded 10/30/60 Hz updates run; default 30 Hz for two seconds | Keystroke-to-input-paint and keystroke-to-correct-result separately, p50/p95, missed frame budgets, stale/missing input; actual IME/composition remains manual acceptance |
| Lifetime cleanup | Stop/dispose old model and unmount renderer, then mount a fresh instance | Subscriber/listener/DOM and heap trends across 100 cycles; collection timing and GC affect results. Short test verifies five remounts with an old burst timer unable to update the new store |
| Control soak | Repeated About dialog focus/Escape/return and start/cancel/reset cycles on the original screen | Input-to-visible response, focus errors, retained dialog nodes/services, idle recovery. Five correctness cycles exist; a longer bounded soak is still needed |
| Idle/background/restore | Existing host/window and readiness protocol | Initial process-tree private memory/CPU collected; I/O/wakeups, GPU attribution and physical minimize/restore latency remain open |

The correctness suite also exercises 10,000-row creation, an empty filter result,
ASCII sequential typing, Hebrew/Arabic filter strings, no extra remote requests,
storage policy and the approved dialog-style allowlist. It checks key identity
across reordering; it does not assert identical DOM reuse for every immutable
value update. For example Solid's `For` tracks item identity, while other
frameworks may explicitly key by numeric ID; allocation/mutation differences
belong in results and may motivate a separately recorded optimized variant.

These implemented probes are not memory-leak proofs or timing evidence. Use
external traces first; if renderer diagnostic instrumentation is needed, build
it as a separate declared lane with equal collection settings. Keep the normal
browser sandbox, CSP, worker ban and native bridge settings unchanged. Timers
are scheduling requests, not guaranteed update/paint rates; report actual state
updates and displayed frames, including coalesced updates and overdue callbacks.

For the measured phase use three warmups and 20 independent action samples per
app/scenario/row-count/rate condition, randomized by round. Measure only after
the initial screen and workload content are ready, then settle for a fixed second.
First prove final output equivalence; a renderer must not win by dropping rows,
filter results, accessibility semantics or updates. Capture the exact input
sequence, row IDs, state changes and completion predicate. Keep the 10,000-row
case separate from the representative small screen. No weighted universal score
should hide a correctness failure, p95 input delay or restoration regression.

Measure a stock-integration lane first. Any optimizations (memoization, granular
subscriptions, virtualized lists, deferred rendering, compiler changes) get a
separate versioned lane and equivalent output/viewport/workload. Do not add
`flushSync`, disable modern React scheduling, force all renderers into the same
notification strategy, or make only one app virtualize. React transitions are
about local UI responsiveness, not server user counts; external-store mutations
also have specific [React constraints](https://react.dev/reference/react/useSyncExternalStore).
The shared-atom lane cannot establish a winner for framework-native state,
Astro hydration, routing, IPC, rich editors or the other eighteen-plus controls
not implemented by the original dialog/progress screen.

Before product selection, add those controls only when required by real flows,
and assess accessible names, validation/error states, keyboard/IME/RTL/high
contrast, file-dialog boundaries and maintenance effort. Record DX using the
same small change request (for example one extra filter and error state),
including review time, custom adapter code and regressions; source line counts
or theoretical runtime complexity alone are insufficient.

Optional browser diagnostics now specified in the
[comparison's metric definitions](CODE-COMPARISON.md#lighthouse-and-core-web-vitals-useful-diagnostics-not-framework-scores):
FCP, LCP, eligible interaction/Event Timing, CLS, long-task/loading blocking time
and main-thread trace attribution. A bounded opt-in [browser collector](DIAGNOSTICS.md)
is now implemented for raw entries and provisional shift/blocking summaries.
Main-thread trace attribution, full browser-entry native JSON extraction and
physical presentation remain pending; external client-frame/UIA/process
collection is now published. Record support, time origins, navigation,
finalization rules and overhead; do not infer field INP or Lighthouse TBT from
Playwright test duration. Keep native launch/visual/readiness clocks and the
whole-process resource measurements as the primary desktop evidence.

After Ready, settle consistently and sample the full host/WebView2 process tree
at 1 Hz for 60 seconds of visible idle. Repeat independently for unfocused,
occluded, minimized and restored states. Capture process roles/identities,
private working set, private bytes, total working set (labeled), CPU seconds,
I/O and GPU allocations where the selected tool can attribute them reliably.
Do not treat summed shared working-set pages as private resident RAM. Preserve
CPU normalization and sampling-overhead definitions.

Use separate 20-run action traces: dialog open/close; encrypt start → visible
progress → cancel → reset; decrypt start → complete → reset; restart/reset
during progress. The simulation is deliberately two seconds at a target 10 Hz,
using elapsed monotonic time. Do not rank encryption speed from this delay.
Measure input-to-visible response separately with an external clock/UIA and,
where needed, presentation tracing. No active animation should run during idle.

Close gracefully after each run, and verify the host and that profile's browser
helpers exit within 30 seconds. The correctness harness implements this exit
check. Record leftover-helper failure rather than treating a forced kill as
success. Never select unrelated processes by executable name alone. The known
early-initialization shutdown issue remains a comparison limitation.

Keep physical keyboard, Narrator/NVDA, high contrast, 100/150/200% DPI,
multi-monitor movement, RTL and actual browser/OS network-storage tracing in
the acceptance matrix. Automated media emulation is a smoke check, not full
Windows acceptance. Building the apps alone did not supply performance evidence;
the initial external startup/resource/control and list/input cohorts are now
published above. GPU/frame-time, physical acceptance and extended scenarios
remain open. No universal framework or renderer-family winner is established.
