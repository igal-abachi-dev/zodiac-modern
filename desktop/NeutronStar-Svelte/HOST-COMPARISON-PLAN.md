# Six-host Svelte comparison

## Selected WebView2 product default - 2026-10-24

**Tauri v2 + Svelte 5 is now our default WebView2 stack for feature-rich desktop
products**, following the user's selection after reviewing the measured results.
Keep NeutronStar C++ as the minimal baseline and an option for narrowly scoped
offline utilities. The [stack decision](../WEBVIEW2-STACK-DECISION.md) records
the evidence, maintenance rationale, C++ improvement priorities and remaining
gates. Tauri/Svelte will represent WebView2 in the later comparison against
non-WebView2 GUIs; the overall desktop GUI winner is still undecided. This
selection does not mark the test host or a complete product release-ready.

The canonical source for that next comparison is now
[`Tauri-v2-Svelte5`](../Tauri-v2-Svelte5/README.md): standalone Svelte/TypeScript
sources, standard Tauri/Vite build hooks, explicit Rust window/policy callbacks
and embedded Release assets. Every later stack, including Electron, independently
implements its UI/behavior: no imported Tauri frontend or shared runtime/dist.
The shared-frontend approach belongs to the earlier WebView2-host isolation
experiment only. Keep `Tauri-v2-Test` unchanged as the historical
control. The short parity/configuration check and next benchmark artifact freeze
are still separate from selecting this reference implementation.

2026-10-24: **six-host pilot and full measurement collection completed**. See the
[results, interpretation and raw archives](../host-test-support/results/2026-10-24/RESULTS.md).
The common UIA3 correctness workflow passed all six. The accepted pilot included
36 attempts plus 18 bounded first-visible-window close probes. Measured endpoints:
480 startup launches, 30 independent idle lifetimes, 120 usable action lifetimes
and 120 supplemental list-workload lifetimes. All selected observations passed
their semantic/lifecycle checks and final frozen-artifact review.

Startup/idle use H. A provider COM query failure during an action warmup caused
the entire action lane to be independently piloted/recollected in I with bounded
read-only retries; no input replay or pooling across collector revisions. One
WinUI action attempt timed out during user-reported mouse interference; the
explicitly authorized single retry passed, giving n=20 usable trials per host.
The original failure remains unchanged and excluded, and the retry is outside
the original randomized order. Supplemental preparation A also stopped during
reported computer use; its records remain separate from the complete B cohort
(six pilot, 18 warmup, 120 measured attempts, all passed).

Keep C++ as the minimal baseline: raw Rust does not show a decisive retained-startup
advantage. Tauri is a credible complete-framework candidate with similar retained
startup/private resident memory and a lower fresh-profile median in this setup.
Wails, pywebview and WinUI have documented configuration/deployment trade-offs;
the results do not establish security parity or a universal best host. Remaining
gates are physical accessibility/IME/high contrast/multi-monitor/DPI, GPU/energy,
physical presentation, deployment and native-policy review. The historical early
initialization lifecycle concern remains open beyond the bounded close probes.
See the [protocol and amendments](../host-test-support/measurement/PROTOCOL.md).

2026-10-23: **WinUI 3 / C# + WebView2** is implemented and Release-published in
`../WinUI3-webview2/`, using the unchanged 16 Svelte assets. Thirty policy/integrity
assertions and visible dialog/action/reset checks passed. Fresh and retained
production workflows now pass with the test-only UIA3 checker, including Cancel
and Escape/focus return; C++ baseline cross-checks pass too. The older UIA2 path
still cannot expose this WinUI configuration's web document. Physical accessibility,
native policy/helper lifecycle and broader admission remain open. See
[validation](../WinUI3-webview2/VALIDATION.md). This dated implementation note
predates the measurement update above.

2026-10-20 update: use the [shared v2 English/Hebrew/emoji fixture](FIXTURE-REVISION.md)
for every candidate (16 production files, four fonts). All five production
window workflows now passed a limited UIA/real-input smoke check. The broader
admission items below remain open. The older nine-app result files are preserved;
their historical hashes/timings are not the identity of the newly rebuilt GUI.

Status 2026-10-18: standalone Svelte baseline prepared and correctness checked.
All four alternative host implementations and builds are present. Wails,
pywebview and raw Rust passed production screen smoke checks; broader native
admission and all comparative runs are **pending**. Tauri also passed the shared
production screen smoke on 2026-10-20; its policy/a11y/lifecycle gates remain open.
This phase selects a WebView2 host candidate before later Electron/Skia/native
toolkit comparisons. Svelte frontend selection is not native-host selection or
production/release acceptance.

## Candidates and artifact ownership

| Candidate | Native layer | Frontend input | Current status |
| --- | --- | --- | --- |
| NeutronStar Host | Existing C++20 Win32 + official WebView2 SDK/WIL | This project's `dist/` | Baseline; two copied/rebuilt correctness fixtures passed |
| Tauri v2 | Standard Rust application framework; public Tauri APIs only | Same built Svelte files | Implementation in `../Tauri-v2-Test/`; build/native acceptance tracked there |
| Wails | Standard Wails 2.15.0 / Go 1.27.1 | Same files, embedded with hashes checked | Built; production workflow passed; profile/permission differences need separate lane; [validation](../Wails/VALIDATION.md) |
| `webview2-com` | Rust COM bindings with a minimal Win32 window | Same built Svelte files | Built with CFG; production/native policy checks passed visibly; [validation](../webview2-com/VALIDATION.md) |
| pywebview | Python shell forced to the Edge/WebView2 backend | Same built Svelte files | 6.2.1 packaged onedir built; production workflow passed; transport/profile/policy differences; [validation](../PyWebView/VALIDATION.md) |
| WinUI 3 + WebView2 | **C# / XAML**, Windows App SDK and its built-in WebView2 control; public CoreWebView2 APIs | Same built Svelte files and manifest | Built self-contained x64; fresh/retained UIA3 production workflow passed; broader native admission open; [validation](../WinUI3-webview2/VALIDATION.md) |

Here `webview2-com` means the Rust bindings, not a separate browser engine or
C# CoreWebView2. It requires windowing, asset policy and lifecycle code of its
own. Keep that Rust candidate close to the minimal C++ design; direct COM
customization belongs there, not inside the standard Tauri candidate. The C++
baseline already uses the underlying COM API. None of these names
implies a lighter Chromium renderer or proves a performance advantage.

### WinUI 3 / C# candidate scope

Use a minimal C#/XAML WinUI 3 shell containing one built-in WebView2 control.
Keep the existing Svelte UI, Nano Stores state, four fonts, 16 production assets
and readiness contract unchanged. C# owns window/control lifecycle and local
asset delivery/policy; it does not reimplement the screen or workflow in XAML.
No Go CLI, application bridge, tray/updater or unrelated native features.

Pin a supported .NET/Windows App SDK toolchain and dependencies at implementation
time. Build Windows x64 Release with a documented deployment mode. Record the
complete application payload and .NET/Windows App SDK prerequisites; an exe-only
size is not the installed footprint. Native AOT is not assumed or required.

Verify client size/DPI, runtime version, effective arguments, profile/private
browsing behavior, asset origin/transport, CSP and native deny policies through
supported APIs. Apply the same admission checks below and disclose limitations
rather than assuming the first-party wrapper automatically matches the raw host.
Include this candidate in collector launch/readiness/process-tree/shutdown
adapters and pilot checks before the final six-host comparison.

`../WinUI3-native/` is a separate future native-controls benchmark. It does not
belong to this Svelte/WebView2 host comparison. This candidate compares the C# /
WinUI shell plus WebView2, not a native-XAML renderer against Svelte.

### Win32 window versus Tauri window

On Windows, both candidates use the same basic native architecture: a Win32
top-level window (`HWND`) containing a WebView2 controller that displays the
Svelte HTML/CSS/JavaScript. Tauri's window is also a native Windows window.
With decorations enabled, both use native title bars and minimize/maximize/close
controls; the frontend does not render those operating-system controls.

NeutronStar creates and manages the HWND and WebView2 COM interfaces directly
in C++. Standard Tauri normally delegates native windowing to TAO and webview
hosting to WRY, then adds lifecycle, app-protocol assets, IPC, permissions and
application APIs. The raw Rust `webview2-com` candidate follows the direct-host
approach instead of using those Tauri/WRY/TAO layers.

Consequently, the comparison evaluates host implementation, settings, injected
runtime code, transport, lifecycle and framework overhead around the same
WebView2 engine. It does not compare different rendering engines. Identical
Svelte assets do not establish identical native settings or security behavior;
those differences remain explicit admission/measurement conditions.

The [standalone browser preview](BROWSER-PREVIEW.md) displays the same built
frontend in a browser tab. It is useful for UI checks but is a separate container
and cannot substitute for native-host lifecycle or process-tree measurements.

Build the Svelte frontend once; consume it from the candidates with no
framework-specific frontend imports. Embedded candidates must verify their
embedded payloads against the same manifest. Native versions/configuration,
lockfiles and binaries need their own recorded hashes. Any runtime-injected
scripts count as host overhead and must be disclosed; disable unused automatic
bridge exposure where supported. Preserve the old nine-app measured result
files; current sources/assets have been explicitly revised at the user's request.

## Admission before timing

1. Pin each native stack and verify actual Windows 11/WebView2 support from its
   current official documentation. Implement only a single decorated window,
   production local assets, resize/DPI, lifecycle and shutdown. No tray/updater,
   CLI/Go receiver, authentication, telemetry, downloads or application backend.
2. Match client area (960×640 DIP), DPI, zoom, theme, accessibility readiness,
   memory target, visibility and runtime version. Normal-memory, bridge-off is
   primary. Use installed Evergreen consistently or a supported identical Fixed
   Version runtime; do not silently mix runtime versions or disable sandboxing.
3. Match local-content isolation, CSP, remote-navigation/resource rejection,
   popups/downloads/permissions and asset MIME/error behavior. Retain only the
   approved bounded Zag dialog metadata style exception; no CSP relaxation to
   make a candidate pass. Verify headers and actual DOM, not configuration alone.
4. Prefer equivalent local origin/asset transport. If a framework requires a
   different origin, virtual mapping, embedded handler or loopback server,
   disclose it and isolate that configuration. Such a run compares the full
   hosting stack, not only a language wrapper. Count server/helper processes.
5. Match effective profile/cache/private-browsing behavior, not merely profile
   folder names. A host that cannot match a condition must be labeled and put
   in a separate configuration cohort; it cannot silently enter the parity lane.
6. Pass the same workflow, font/readiness, dialog/focus/Escape, keyboard, resize,
   reload/no-persistence and workload checks under the real native host. Adapt
   the correctness transport where host-specific policy probes differ; record
   differences rather than weakening the production screen or security gate.
   Investigate normal and early-initialization shutdown, including helper exit.

## Measurement protocol

Reuse and adapt the [external collector](../webview2-raw-bench/8-framework-test/measurement/README.md)
and [protocol](../webview2-raw-bench/8-framework-test/BENCHMARKING.md), rather than
using each framework's internal ready timer as its start-to-finish result.
Add per-host launch and UIA adapters; the current collector is not automatically
a generic six-host harness. Freeze after all admission checks and a pilot.
WinUI requires the verified UIA3 path in this environment; pilot that same backend
and equivalent readiness/control predicates across all six before timing. Do not
mix UIA2 timings for five hosts with UIA3 timings for WinUI and call the difference
host overhead. The new checker is correctness tooling, not the finished external
measurement harness.

- Pilot baseline plus one candidate, including first/repeat launches, idle,
  dialog and list correctness. Validate launch/readiness/cleanup for each candidate
  in the pilot, then randomize paired rounds across all six admitted candidates.
  Use the prior protocol's warmups and n=20 per launch/workload condition.
- Separate direct-executable from PowerShell startup; profile-fresh from
  profile-retained; record first/repeat pairs. A second launch is not OS-cold.
  Use a separate post-reboot study for OS-cold claims.
- Record launcher start, host process/window appearance, loading text,
  blank/black-frame observations and complete UIA Ready with enabled controls.
  Retain synchronized frame evidence and its sampling interval. UIA readiness
  and captured pixels are not physical presentation timestamps.
- Measure the full process tree using process identity/creation time. Include
  host, WebView2 and any Python/.NET/Go/service/helper processes. Separate
  private resident, commit, working set/shared pages, CPU and restore cost.
  Repeat independent idle lifetimes with balanced visibility-state order;
  repeated samples within one lifetime are not independent experiments.
- Keep visible idle, unfocused, occluded, minimized and restored conditions
  separate. Compare low-memory/suspension options only in explicit secondary
  lanes. Runtime process reuse and warm OS caches must be recorded.
- Reuse the production action/dialog lane and separately built supplemental
  creation/replacement/filter/update/remount workloads. Record input-to-semantic
  response and completion, plus browser/native trace attribution when needed.
  Do not call these UIA endpoints INP, scripting time, FPS or physical paint.
- Measure installed/distribution payload and runtime prerequisites separately:
  exe-only, bundled dependencies and shared WebView2 runtime are different costs.
  Python interpreted development launch and packaged release launch are separate
  conditions, not interchangeable production candidates.
- Preserve errors and invalid attempts with reasons. Verify run-owned helper
  cleanup without terminating unrelated browser processes. Keep performance
  timing separate from diagnostic/test injection overhead.

Report the closely matched C++ NeutronStar versus raw Rust pair separately from
the full six-stack comparison. The WinUI/C# candidate adds its managed runtime,
Windows App SDK/control lifecycle and delivery model; differences cannot be
attributed solely to the C# language. Candidates with unmatched profile/policy
conditions stay in explicitly labeled comparison groups.

Report medians/tails, paired differences and uncertainty, correctness/lifecycle
failures, accessibility and maintenance/security tradeoffs. Accessibility/IME,
high contrast, DPI and multi-monitor testing remain necessary on actual Windows.
Do not choose a host solely from a tiny memory/startup difference: delivery,
updates policy, native API ownership and long-term maintenance also matter.
NeutronStar may remain the best measurement shell while another framework is a
better product shell. No host is currently established as the winner.
