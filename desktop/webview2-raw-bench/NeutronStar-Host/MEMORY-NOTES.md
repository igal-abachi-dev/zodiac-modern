# WebView2 footprint: observed counters and optimization plan

2026-10-17 toolchain caveat: older approximately 3.1 MiB runner figures came from
a build cache with empty Release optimization flags. Explicit optimized C++20
builds now produce 501,248-byte MSVC or 549,888-byte clang-cl runners. Those are
disk sizes, not RAM measurements; they do not demonstrate lower browser-process
memory or invalidate the earlier observed process counters. Repeat footprint
measurements with a recorded optimized host hash before comparing results.
See [the toolchain matrix](TOOLCHAIN.md#executed-matrix-results-2026-10-17).

On 2026-10-16, the user observed roughly 24 MB in the host and a 123 MB WebView2
process with five additional helpers. The user correctly noted that **private
working set was much lower**. We then read Windows performance counters for PID
520 and its descendants before closing this task's old interactive example.
This was the earlier plain-JavaScript example, before the Vite/native-greeting
build. Runtime: installed Evergreen 155.0.4283.45; Windows build 26200.

| PID | Process | Working set (bytes) | Private working set (bytes) | Private bytes |
|---|---|---:|---:|---:|
| 520 | neutronstar_host_runner | 24,518,656 | 2,465,792 | 3,477,504 |
| 7120 | msedgewebview2 | 135,741,440 | 33,599,488 | 42,082,304 |
| 10476 | msedgewebview2 | 14,041,088 | 1,835,008 | 3,051,520 |
| 17836 | msedgewebview2 | 84,099,072 | 29,138,944 | 86,786,048 |
| 10232 | msedgewebview2 | 39,411,712 | 6,512,640 | 11,681,792 |
| 17004 | msedgewebview2 | 20,996,096 | 3,104,768 | 7,929,856 |
| 14860 | msedgewebview2 | 66,469,888 | 18,165,760 | 28,217,344 |
| **Sum (MiB, bytes / 1,048,576)** | **7 processes** | **367.43** | **90.43** | **174.74** |

Method: enumerate `Win32_Process` descendants, then read
`Win32_PerfFormattedData_PerfProc_Process` counters `WorkingSet`,
`WorkingSetPrivate` and `PrivateBytes`, matching `IDProcess`. These counters are
sampled, not an atomic snapshot of the entire tree. Process roles were not
captured, so do not infer which numeric row is GPU/renderer from size alone.
Window visibility, dwell time, machine load and prior interactions were not
controlled. This is an observation, not a median/p95 benchmark or minimum baseline.

Working set includes shareable resident pages; summing it can count the same
physical pages more than once. Private working set is resident memory exclusive
to each process. Private bytes measures private committed virtual memory and can
include nonresident pages. It is not another resident-RAM figure. These counters
also do not fully describe GPU allocations, kernel resources or the incremental
cost of evicting other applications. Use the Windows counter definitions when
exporting results; do not label all three simply “RAM.” See
[Microsoft's process-memory counters](https://learn.microsoft.com/en-us/windows/win32/psapi/process-memory-usage-information).

## What is normal, and what can improve?

WebView2 uses a browser process, renderer(s), and GPU/utility helpers. This is
normal browser isolation, not evidence by itself that the host created redundant
views. Runtime binaries can be shared on disk and some pages shared in RAM;
separate app profiles normally have separate process groups. Neither installing
WebView2 nor already running Edge makes another application's memory free.
See [Microsoft's process model](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-model).

| Option | Current host | Expected value / tradeoff |
|---|---|---|
| One controller/environment, reuse for hash views | Implemented | Avoids redundant browser instances; no extra WebView per route |
| Hide controller while minimized; show on restore | Implemented in `WM_SIZE` | Chromium can throttle hidden-page work and purge caches; visible-window baseline remains |
| Wry/Tauri default minimize behavior | Wry also hides its Windows WebView when minimized | Same baseline policy as this host; does not eliminate browser process memory |
| Lean production assets, external CSS, no polling/continuous animation | Example uses this pattern | Reduces frontend work; does not remove browser fixed cost |
| `ICoreWebView2_19::put_MemoryUsageTargetLevel(LOW/NORMAL)` | **Implemented opt-in, 2026-10-17**: `--memory-target low` and native setter | Best-effort target, not a cap; scripts continue, paging can increase, explicitly restore NORMAL |
| `ICoreWebView2_3::TrySuspend` / `Resume` | **Proposed separate opt-in variant** | Hidden view required; pauses timers/animations best effort; verify completion and restoration |
| Close/destroy browser while app is hidden, recreate later | **Research only** | Can release more resources but loses document state and increases restore cost; requires lifecycle validation |
| Use smaller frontend libraries | Eight-framework work pending | Can reduce JS/DOM cost; cannot eliminate Chromium baseline |
| Different C++ compiler or Tauri/Wry/Tao wrapper | Not a browser-memory solution | May change native shell cost, not remove WebView2's process architecture |

The API references recommend choosing **either** low/normal targeting **or**
suspend/resume; do not combine them as independent memory-saving switches.
Wry exposes an optional Windows `set_memory_usage_level` API, but it is an
explicit app operation; Wry's ordinary minimize behavior is to hide the view.
For the baseline Tauri comparison, do not activate Wry's optional memory API.
Feature-query interfaces and handle unsupported runtimes. Suspension is not
secure memory erasure; paging and browser state remain relevant to future secret
handling. Existing hidden smoke tests exercise correctness, not visible footprint.
Sources: [controller visibility](https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2controller.isvisible),
[memory target semantics](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/icorewebview2_19),
[suspension semantics](https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2.trysuspendasync).

Keep GPU acceleration and browser isolation enabled in the baseline. Disabling
GPU may shift work to CPU/software rendering and harm power/latency; fewer
processes is not proof of less total cost. Do not use Chromium single-process,
no-sandbox or arbitrary feature-disable flags as product optimizations. Do not
force working-set trimming to manufacture a low idle number. See
[Microsoft's performance guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/performance).

## Comparison decision and test design

For a small offline encrypt/decrypt utility, **Avalonia/C# and native WinUI remain
serious candidates**. Avalonia can avoid the separate browser engine when no
WebView is embedded, while still paying .NET/Skia/compositor/font/GPU costs.
A single process is easier to count but does not guarantee lower memory, CPU,
better accessibility or faster rendering. WebView2 remains worth testing for
web UI productivity and rich components; it is not selected as the product
winner by the tiny C++ executable or this example.

Measure the identical synthetic UI with no Go CLI: empty native window, WebView2
empty page, example, eight equivalent frontend builds, and an equivalent Avalonia
AXAML control screen. Include a WinUI native screen if feasible. This separates
host/browser fixed costs from framework costs. Use Release, matched viewport/DPI,
theme/font/content and production CSP. Keep one fixed host binary/runtime/profile
policy across the eight; do not change native settings to favor individual builds.

For every variant, sample tree counters at 1 Hz after a documented settling
interval, then record at least 60 seconds each visible idle, unfocused, minimized,
and restored, plus input/resize/scroll activity. Collect process roles/counts,
private working set, private bytes, total working set (labeled), CPU seconds,
I/O, hard faults and GPU dedicated/shared allocation. Repeat in randomized order;
report median/p95 and machine/runtime/build metadata. Separate first-use profile,
reused-profile warm launch and OS-restart cold launch. Do not pool them.

Compare default hidden-controller behavior, LOW/NORMAL, and suspend/resume as
**three separate host policies**, applied consistently to every frontend.
Measure restore-to-first-painted-frame and first successful input alongside
memory savings; count failed suspension, lost state, late native replies and
remaining helpers after close. Keep known initialization-close acceptance open
until its intermittent failure is understood. LOW/NORMAL targeting is now
implemented and API-tested; no memory-saving performance result has been measured.
Suspension remains unimplemented.

## Implemented target option — 2026-10-17

`--memory-target normal|low` selects the initial target; normal remains the
default and does not touch the API during startup. The library additionally
provides `set_memory_usage_target(MemoryUsageTarget::low/normal)` on its STA.
LOW initialization requires `ICoreWebView2_19`; unsupported runtimes fail explicitly
rather than silently substituting a policy. Setter/getter read-back tests verify
the target, not the time or amount of memory reclaimed. The CLI target remains
fixed until changed through the native API or the window closes; it is not an
automatic low-when-minimized/normal-when-active policy.

Release and Debug regression runs exercised LOW -> NORMAL -> LOW and the usual
page/CSP script checks. Keep future footprint experiments separate from the
normal/decorated nine-app baseline and record the target in each result. Do not
infer a savings percentage or faster startup from these correctness tests.
The [README](README.md#low-memory-target) describes the option and the
[validation record](VALIDATION.md#optional-window-controls-and-memory-target--2026-10-17)
contains test evidence.
