# Six-host pilot and primary benchmark protocol

2026-10-23. All six candidates display the same frozen Svelte production assets.
This is an **as-configured hosting-stack** experiment, not security equivalence,
language-only overhead, a production audit or a post-reboot cold-start study.
Raw C++ versus raw Rust is a closer comparison than either versus a full framework.
Wails uses its persistent profile/native permission defaults; pywebview uses a
loopback server/private profile cleanup; Tauri and WinUI add framework control
lifecycle and injected/runtime components. Keep those labels in the results.

The collector adapts the historical nine-frontend collector's process identity,
Process V2 private-working-set counters, QPC/UTC anchors, GDI client-area frames
and shutdown checks. UIA3 is used for **every** candidate. Do not pool these
results with historical UIA2 measurements. No DevTools, script injection or CSP
relaxation is used. Test-only FlaUI 5.0.0 dependencies are NuGet-locked.

## Pilot and acceptance

First pass the same UIA3 production correctness workflow across all six. Then
collect 36 pilot attempts: two direct and two PowerShell launches per host, one
five-state short idle lifetime and one two-cycle action lifetime. Review results,
runtime identities, process arguments, client geometry, frame evidence, private
memory counter completeness and discovered helper exit. A pilot failure stops
collection and remains recorded; a collector change requires a new freeze/pilot.
Write `pilot-accepted.json` only after that review. Native security-policy probes,
physical AT/IME/DPI and clean-machine deployment remain distinct open gates;
as-configured performance cannot establish those properties.

## Full primary cohort

- Startup: first/repeat diagnostic pairs per host and launch method; three
  randomized warmup rounds; **20 randomized paired rounds** for each of six
  hosts × direct/PowerShell × fresh/retained path (480 measured launches).
- Idle: **five independent process lifetimes per host**, each with 12 one-second
  samples in visible, unfocused, occluded, minimized and restored conditions.
  A cyclic Latin-square state order balances positions across the five lifetimes.
  There are 60 samples per state/host, but only five independent lifetime units;
  report distributions of lifetime medians, not 60 independent replications.
- Actions: three warmup and **20 independent process lifetimes per host**, one
  common production cycle each. Report About open/close, simulation-start, cancel
  and reset input-to-UIA endpoints. The simulation's fixed delay is not compute
  throughput. Supplemental list workloads require separately built, hash-matched
  host artifacts and are not silently substituted into this production lane.

Expected primary attempts: 24 pairs + 72 warmups + 480 measured startup + 30 idle
+ 18 action warmups + 120 measured actions = **744**, plus 36 pilot attempts.
No failed attempt is silently replaced. Runtime change or frozen artifact change
stops the cohort. Files are fully hashed at phase start/end and size/mtime checked
after each attempt; hashing warms OS caches. A retained path does not guarantee
browser cache retention, especially for InPrivate/cleanup configurations.

### Actual phase amendments, 2026-10-24

The H cohort completed all 480 measured startup launches and 30 measured idle
lifetimes. Its first action warmup (`action-warmup-01-tauri`) failed on a UIA
provider COM query. Preserve that failure. H's original collector binary and
source were archived before the action collector revision.

The entire action lane was independently piloted and collected in I, with bounded
read-only provider-query retries and no replay of dispatched input. Its six pilot,
18 warmup and 120 planned measured attempts are separate from H. One measured
WinUI About-open attempt (`actions-19-winui`) timed out without a provider exception.
A documented
schedule-only continuation completed the remaining preplanned trials using the
same frozen I collector. The user subsequently reported an accidental mouse click
in another window and explicitly authorized a retry. Preserve the original
failed attempt unchanged, exclude it for reported external input interference,
and retain the single successful retry in `six-host-actions-20261024-i-interference-retry`.
Its collector/host/assets match I; it is outside the original randomized order.
Usable action sample sizes are now 20 per host. Neither failure invalidates the already completed startup/idle
endpoints; neither may be described as an all-pass action result.

The initial supplemental preparation cohort A stopped on a Tauri warmup timeout
after reported computer use. It contains no measured results to pool. Its raw
records remain preserved. Restart the complete supplemental pilot/warmup/measurement
schedule as cohort B with the same frozen collector and artifacts.

The supplemental list lane uses its own identical Svelte assets, independently
staged native artifacts and collector freeze: six pilot attempts, 18 warmups and
120 planned measured lifetimes. These results do not measure production startup.

## Endpoints and limits

PowerShell uses a common bounded launcher/receipt, not each user's Explorer
right-click gesture. Its execution-policy option is process-local; no machine
policy is changed. Direct and PowerShell lanes remain separate. Ready requires
the heading, fixture, visible Ready and both enabled actions. UIA polling adds
provider/query time. Startup captures request 20 Hz; report actual frame intervals.
Three matching quantized content frames plus a one-second Ready tail are a
stability proxy, not physical scan-out or an exact first-paint timestamp.

Initial client dimensions and DPI are recorded. The collector calibrates a
mismatched outer-window convention to 960×640 client DIP before readiness capture;
this external resize and its startup cost are explicitly recorded. It does not
change the host binary or frontend. Runtime version comes from actual discovered
WebView2 process modules; command lines are recorded only for run-owned processes.

Memory includes the root and identity-verified descendants. Report private
resident and commit separately; summed working set double-counts shared pages.
Discovery is sampled at 100 ms and can miss short-lived children. One-second
sampled maxima are not true peaks. Process creation time prevents stale parent-PID
reuse from attaching unrelated processes. Normal close must exit the host and
all discovered run-owned helpers; forced termination never counts as success.
The collector/focus/occlusion fixtures are excluded from the target tree but add
measurement overhead. Other user applications remain running and uncontrolled;
record the environment and do not stop unrelated processes.

Remaining endpoints include GPU/energy, physical presentation, post-reboot tests,
physical accessibility/IME/DPI and security parity. The separate supplemental
large-list cohort B completed six pilots, 18 warmups and 120 measured lifetimes;
see the [published six-host results](../results/2026-10-24/RESULTS.md).
Report these as unmeasured rather than inferring them from startup/RAM.
