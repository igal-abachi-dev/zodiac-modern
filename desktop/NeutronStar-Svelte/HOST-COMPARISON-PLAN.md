# Five-host Svelte comparison

Status 2026-10-18: standalone Svelte baseline prepared and correctness checked.
Tauri's public-API host implementation is in progress; its native acceptance,
the other three implementations and all comparative runs are **pending**.
This phase selects a WebView2 host candidate before later Electron/Skia/native
toolkit comparisons. Svelte frontend selection is not native-host selection or
production/release acceptance.

## Candidates and artifact ownership

| Candidate | Native layer | Frontend input | Current status |
| --- | --- | --- | --- |
| NeutronStar Host | Existing C++20 Win32 + official WebView2 SDK/WIL | This project's `dist/` | Baseline; two copied/rebuilt correctness fixtures passed |
| Tauri v2 | Standard Rust application framework; public Tauri APIs only | Same built Svelte files | Implementation in `../Tauri-v2-Test/`; build/native acceptance tracked there |
| Wails | Go application framework | Same files, embedded/copied with hashes checked | Adapter pending in `../Wails/`; pin release line before implementation |
| `webview2-com` | Rust COM bindings with a minimal Win32 window | Same built Svelte files | Adapter pending in `../webview2-com/` |
| pywebview | Python shell forced to the Edge/WebView2 backend | Same built Svelte files | Adapter pending in `../PyWebView/`; freeze packaging/dependency versions |

Here `webview2-com` means the Rust bindings, not a separate browser engine or
C# CoreWebView2. It requires windowing, asset policy and lifecycle code of its
own. Keep that Rust candidate close to the minimal C++ design; direct COM
customization belongs there, not inside the standard Tauri candidate. The C++
baseline already uses the underlying COM API. None of these names
implies a lighter Chromium renderer or proves a performance advantage.

Build the Svelte frontend once; consume it from the candidates with no
framework-specific frontend imports. Embedded candidates must verify their
embedded payloads against the same manifest. Native versions/configuration,
lockfiles and binaries need their own recorded hashes. Any runtime-injected
scripts count as host overhead and must be disclosed; disable unused automatic
bridge exposure where supported. Never modify the old nine-app frozen cohort.

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
a generic five-host harness. Freeze after all admission checks and a pilot.

- Pilot baseline plus one candidate, including first/repeat launches, idle,
  dialog and list correctness. Then randomize paired rounds across all five.
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

Report medians/tails, paired differences and uncertainty, correctness/lifecycle
failures, accessibility and maintenance/security tradeoffs. Accessibility/IME,
high contrast, DPI and multi-monitor testing remain necessary on actual Windows.
Do not choose a host solely from a tiny memory/startup difference: delivery,
updates policy, native API ownership and long-term maintenance also matter.
NeutronStar may remain the best measurement shell while another framework is a
better product shell. No host is currently established as the winner.
