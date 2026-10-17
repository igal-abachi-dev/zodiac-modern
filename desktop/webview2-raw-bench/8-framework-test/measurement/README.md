# External Windows measurement harness

Completed initial collection: [900 primary + 210 supplemental passing attempts](../results/2026-10-17/RESULTS.md),
with [interpretation](../results/2026-10-17/INTERPRETATION.md) and raw metadata.
The historical collector issues below are retained, not framework failures.
The final accepted cohorts are `benchmark-20261017-e` and `workload-20261017-g`.
Five Python analysis regressions and the C# stale-ancestry/PID-reuse fixtures pass.
The interim summary's fresh/retained suffix typo was fixed only in postprocessing
after primary collection; original summary and frozen original source remain.

This is research tooling outside the C++ host and frontend bundles. It uses the
installed .NET 10 Windows Desktop runtime, Windows UI Automation, Win32 process
and memory APIs, Process V2 performance counters and GDI client-area capture.
There are no external NuGet dependencies. It does not enable DevTools, inject
JavaScript, weaken CSP or add a host command channel.

The initial accepted collector pilot is `.cache/benchmark-20261017-c`: all 18
attempts passed across vanilla, Svelte and React. That covers two launches per
launch lane, five background states and two action cycles per app. Earlier
collector prototypes and their failures remain in separate cache folders.
Pilot success is not completion of the comparative cohort.

The first startup-pair cohort stopped at `pair-htmx-direct-2`: the UIA worker
received a COM provider disconnect while WebView2 replaced its initial document.
Frames showed rendered content, but semantic readiness was unobserved. That is
a collector failure, not an accepted htmx startup result. All 52 attempts
(51 passing, one rejected) are retained. A bounded provider-query retry now
records the HRESULT and gap, reacquires the provider and never assumes Ready.
Ten consecutive provider failures still fail collection. This source change
requires a new freeze/pilot (`benchmark-20261017-d`); results are not pooled.
That new pilot passed all 18 attempts, including one recorded provider recovery.
The independent supplemental collector's final three-app pilot also passed;
see [its scope](../measurement-supplemental/README.md). Both collectors' binaries
and source are preserved under their cohort's `collector-artifact` directory.

Cohort `d` subsequently stopped during Alpine warmup on an apparent helper-exit
failure. Investigation found two attributed processes whose creation times
preceded the host: stale Toolhelp parent PIDs had matched newly reused PIDs.
This was another collector failure, **not evidence that Alpine or the host
leaked helpers**. No unrelated process was terminated. Those 57 attempts remain
separate from the replacement cohort `e`. Discovery now verifies the live parent
identity and requires each child to have been created no earlier than its
verified parent. A no-dependency regression executable checks stale ancestry,
unordered grandchildren, reused live PIDs and genuine replacement descendants:

```powershell
dotnet restore measurement-tests/ProcessTreeTests.csproj --configfile measurement/NuGet.Config
dotnet run --project measurement-tests/ProcessTreeTests.csproj -c Release --no-restore
python -m unittest discover -s measurement -p test_analysis.py
```

The host's older early-initialization shutdown investigation remains open; a
collector attribution error neither reproduces nor resolves it.

## Reproduce

From `8-framework-test`, after production assets and the Release host exist:

```powershell
$env:DOTNET_CLI_HOME = Join-Path $PWD '.cache/dotnet-home'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
dotnet restore measurement/Measurement.csproj --configfile measurement/NuGet.Config
dotnet build measurement/Measurement.csproj -c Release -o .cache/measurement-bin --no-restore
python measurement/run.py pilot --folder .cache/my-cohort
# Inspect raw results/frames and write pilot-accepted.json only after review.
python measurement/run.py startup --folder .cache/my-cohort
python measurement/run.py resources --folder .cache/my-cohort
python measurement/run.py actions --folder .cache/my-cohort
python measurement/run.py summarize --folder .cache/my-cohort
python measurement/analyze.py .cache/my-cohort
```

Python 3 with its standard library is sufficient. Keep the desktop available:
these are foreground, real-input runs. Do not interact with a measured window
or run builds/other benchmarks concurrently. Helpers launched by the harness
are hidden; the measured application is visible. Only run-owned windows and
processes are closed. A failed attempt is retained and stops collection.

The collector/source, host, launcher, lockfile and every production asset are
hashed before collection and checked after each sample. Use a new cohort after
changing any frozen file. Runtime changes stop the cohort. `environment.json`
records the machine separately; retain it with the freeze and raw files.

Startup uses three warmup rounds and 20 measured rounds for every app × direct/
PowerShell × fresh/retained path condition. First/repeat diagnostic pairs remain
separate. Idle uses one process lifetime per app, 60 samples in each of visible,
unfocused, occluded, minimized and restored states. Actions use 20 repeated
cycles in one lifetime. Those samples are correlated; they are not 60 or 20
independent application launches.

## What the timestamps mean

- Stopwatch/QPC is the collector's common monotonic clock. A bracketed UTC
  anchor maps OS process-creation times into that timeline. Keep the bracket
  and observation intervals; they do not establish submillisecond accuracy.
- Direct launch and a newly created Windows PowerShell process are separate
  lanes. The latter uses `-NoProfile -NonInteractive -File Run.ps1`; the script
  emits a bounded launch receipt. This is **not** an Explorer right-click timing
  measurement. The Explorer gesture interval is explicitly unavailable.
- UIA Ready requires the heading, synthetic fixture, visible Ready status and
  both enabled action buttons. UIA polls every 50 ms plus provider/query time.
  Provider activation and accessibility-tree creation can perturb startup.
- Actions use actual Windows mouse input, located through document-scoped UIA.
  Input-to-UIA-observed response includes provider/polling overhead. A subsequent
  captured frame is supporting evidence, not physical input-to-paint latency.
- GDI copies only the foreground **client area**, excluding native caption and
  rounded borders. The requested capture rate is 20 Hz; actual frame intervals
  are retained and were closer to 90 ms in the pilot. PNG encoding runs on a
  bounded background queue; overflow invalidates the attempt.
- Near-black/near-white/accent labels are sampled-pixel heuristics, not OCR.
  Three matching quantized frames plus semantic Ready and a one-second tail
  form a stability proxy. Review screenshots for meaning. Sub-frame flashes,
  exact compositor presentation and physical panel scan-out remain unavailable.

## Resources and lifecycle

Discover descendants every 100 ms and sample resources roughly once a second.
Use PID **and creation time**; Process V2 supplies unambiguous PID-attributed
private working sets. Reject ambiguous/missing counter attribution. Each sample
records its collection duration and completeness.

Report private resident memory and private commit separately. Summed total
working set includes shared pages multiple times and must not be called unique
RAM. CPU comes from per-process cumulative CPU deltas. One-second sampled maxima
are not true peaks, and short-lived helpers can escape the discovery interval.
The collector's CPU cost is recorded separately. Its owned focus/occlusion
fixtures are excluded from the target process tree, but still impose overhead.

Shutdown must close the host and discovered run-owned helpers gracefully. Forced
termination cannot turn a lifecycle failure into a passing clean-start sample.
Fresh paths and verified new processes do not empty OS file/font caches. The
host uses InPrivate mode; retained paths do not prove persistent browser cache
reuse. Neither condition is a controlled post-reboot cold start.
Integrity hashing itself reads the host/assets and warms their OS file-cache
pages. The .NET collector is already running before target launch; a future
Avalonia comparison must account for preloaded CLR pages too. These are
instrumented lab conditions, not untouched-machine cold-start measurements.

## Later WebView2 / Electron / Avalonia study

The portable endpoints are launch-to-usable UI, semantic interaction response,
observed startup transitions, process-tree private resident/commit memory, CPU,
idle/background/restore behavior and graceful lifecycle. Use equivalent fixtures,
window dimensions, design, data, readiness, workload and resource accounting in
all three hosts. Avalonia's usual single UI process is not a reason to omit any
helpers; Electron and WebView2 must include their entire attributed trees.
The protocol is portable; the current launch arguments and document-scoped UIA
locators need adapters for Electron/Avalonia, especially native Avalonia controls.

Add equivalent native accessibility/keyboard/IME and DPI tests, reliable GPU and
frame-pacing traces, I/O and energy/battery measurements, and on-disk/install/
runtime footprints. Record framework/runtime versions, sharing assumptions,
packaging/update/signing effort and development/maintenance costs separately.
These additions are not collected by the current harness. A shared WebView2
Runtime installation does not imply one shared browser process or zero RAM cost.

The nine frontend results compare renderers **inside one WebView2 host**. They
cannot rank WebView2 against Skia/Avalonia or Electron, and cannot establish a
universal framework winner. Synthetic UI delays say nothing about Go/crypto
throughput. Physical assistive-technology acceptance remains a separate gate.
