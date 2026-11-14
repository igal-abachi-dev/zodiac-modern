# Independent desktop implementations

Updated 2026-11-03. This stage builds and checks applications before running a
new cross-toolkit benchmark. The old six-host WebView2 measurements remain a
separate frozen experiment. Tauri + Svelte is the selected WebView2 representative.

The later [Qt/C++ host diagnostics follow-up](DESKTOP-DIAGNOSTICS-2026-10-31.md)
changes their current binaries/readiness/deployment and requires fresh artifact
freezes. Automated failure, normal/contrast and lifecycle checks are separate
from the still-open clean-VM and physical AT/IME/multi-monitor gates. No later
performance cohort was run as part of that work.

| Current candidate | Stack | Implementation strategy |
| --- | --- | --- |
| `Tauri-v2-Svelte5` | Tauri 2.12.4, Svelte 5.57.2, WebView2 | Own Svelte UI, Nano Stores, Ark, embedded dist |
| `Electron` | Electron 45.0.0, Svelte 5.57.2, bundled Chromium 156 | Independently authored UI/controllers, Svelte runes, Ark, ASAR |
| `Avalonia` | Avalonia 12.1.4, Toolkit 8.4.2, self-contained .NET 10 | Independently authored AXAML/MVVM, Fluent controls, Skia |
| `WinUI3-cs-native-mvvm` | Windows App SDK 2.5.1, Toolkit 8.4.2, self-contained .NET 10 | Independently authored native XAML/compiled bindings, Fluent controls, unpackaged Win32 |
| `WinUI3-cs-native-reactor` | Windows App SDK 2.5.1, Reactor 0.1.0-preview.16, self-contained .NET 10 | Independent C# MVU/components/reducers over native Fluent; experimental, unpackaged Win32 |
| `Flutter` | Flutter stable 3.47.8, Dart 3.13.7, flutter_svg 2.3.0 | Independent AOT Dart UI/controllers, stock Material 3, local fonts/SVGs, standard C++ Win32 runner |
| `Qt` | Qt 6.12.0 Quick/QML, C++20, clang-cl 22.1.3, Ninja, Microsoft linker | Independent typed C++ model/controller, standard Basic controls with local styling, Qt Quick RHI D3D11, dynamic Qt/CRT |
| `slint-rust` | Slint 1.18.1, Rust 1.99.1, Winit/Skia, AccessKit | Independent Rust models/timers and compiled Slint UI, standard Fluent widgets, embedded local assets |
| `react-native-windows` | RNW 0.85.0, React Native 0.85.3, React 19.2.3, Hermes, MSVC v145 | Independent TSX/reducer UI, Fabric/Windows Composition, unpackaged Win32, bundled optimized Hermes bytecode; system Segoe UI limitation |
| `wxWidgets` | wxWidgets stable 3.2.12, C++20, clang-cl/Ninja/Microsoft linker | Independent C++ models, standard wxMSW native controls, normal non-virtual wxListCtrl, static wx/CRT and local fonts/SVGs |
| `Dear-ImGui-dx11-12` | Dear ImGui 1.93.0, C++20, clang-cl/Ninja/Microsoft linker, Win32 + DX12/DX11 | Independent immediate-mode controls/state; DX12 default with startup DX11 fallback and explicit strict renderer options; static CRT, local fonts/native vector icons |

The candidates implement the [reference behavioral inventory](Tauri-v2-Svelte5/FEATURE-PARITY.md),
including the complete workbench, with the text/accessibility differences below.
Share design/fixture specifications and external
test infrastructure, not runtime UI/state packages or sibling dist directories.
Use local equivalent fonts/icons. Report native text/control differences and
font container formats (TTF versus WOFF2). The Electron renderer intentionally
uses runes instead of copying Tauri's Nano Stores model: results compare practical
whole stacks, not an isolated graphics-engine or language effect.

The [RNW candidate](react-native-windows/README.md) explicitly uses system Segoe UI:
its pinned Fabric release does not load custom local TTF collections in this
text path. Its Lucide icons are local rasterizations of the same SVGs. Establish
a common-font lane or disclose this visual/font difference before comparative
measurement. It is not a WebView2 client and its React UI uses no HTML or CSS.
The [wxWidgets candidate](wxWidgets/README.md) stores all native list items eagerly
without owner-data/virtual mode; structural changes rebuild native items and
value updates change touched text. Native clipping/control identity differs from
the reference's keyed DOM rows. These are whole-stack implementation differences.

The [Dear ImGui candidate](Dear-ImGui-dx11-12/README.md) implements the main and
complete workbench behaviors, but does **not** meet full text/accessibility parity:
stock widgets have no Windows UIA provider here, and full bidi/shaping/color emoji
are not provided by this text path. Exact UTF-8 fixture data is preserved.
Every matching model row is submitted without ImGuiListClipper, but immediate-mode
items are not retained native/DOM peers. Idle redraw policy is on demand.
Its test-only read-only snapshots support real pointer/keyboard checks; they are
not UIA or measurement endpoints and are absent from the published executable.

For later measurement, use the production ImGui binary, record actual API/adapter,
separate hardware/WARP and fallback runs, and calibrate external pixel/presentation
readiness rather than substituting its instrumented state timestamps for other
candidates' UIA endpoints. Verify the actual adapter matches between explicit
DX11/DX12 runs; default adapter selection policies can differ on multi-GPU systems.
Actual RDP configurations and text/AT acceptance remain open. The old cohorts are
unchanged; no cross-toolkit winner follows from this work.

RNW/wx implementation and correctness evidence is recorded separately in their
`VALIDATION.md` files. This addition runs no comparative timing/memory cohort;
the existing WebView2 results remain unchanged. Backlog before measurement:
normalize/disclose fonts and control differences, freeze the final folders,
calibrate native UIA/presentation endpoints, and retain the user-deferred physical
AT/IME/OS contrast/multi-monitor/clean-machine gates.

## Before measuring

1. Pass each app's build, model and actual-window checks. Retain failed attempts
   and checker corrections. Complete the physical keyboard/AT/IME/contrast/DPI
   review required for the particular comparison; UIA success alone is not it.
2. Freeze source, locks, full published folder/ASAR/EXE hashes, runtime versions
   and delivery mode. Never compare only Avalonia's small apphost EXE with the
   entire Electron distribution. Include required WebView2/runtime deployment
   assumptions for Tauri. No dev servers or debug builds in the primary lane.
3. Extend/calibrate the external collector for all candidate automation/presentation
   trees. Validate actual HWND client geometry, clock origin and readiness.
   UIA rectangles and semantic Ready are not physical presentation timestamps.
4. Match light opaque chrome, 960 × 640 logical client area, scaling, fixtures,
   update duration/rates, row identity and filtering behavior. Pin actual browser
   versions; WebView2 and Electron Chromium versions may differ and must be disclosed.
5. Pilot before the full randomized paired cohort. Distinguish fresh profile,
   retained profile, first/repeat launch, post-reboot and PowerShell/direct paths.

## Metrics and interpretation

- Full process-tree private resident/commit/working set, CPU, background/minimized
  activity, restore, helper exit and repeated open/close behavior.
- Process creation → visible window → loading/blank/black/content transitions,
  semantic Ready and physical presentation as separately defined endpoints.
- Startup distributions/uncertainty, interaction/input-to-presentation, dialog,
  filtering during updates, 1k/10k creation/replacement/reverse/splice/update and
  remount/cancellation. Requested Hz is not achieved FPS.
- GPU/energy/frame pacing, font/text quality, Hebrew/bidi/IME, screen reader and
  focus behavior. Record unsupported metrics rather than assigning zero.
- Full delivery size, dependency servicing, first/incremental build DX and
  implementation complexity. Do not infer memory or responsiveness from JS bytes.

The primary list lane is unvirtualized in every implementation. Add a separate
equivalent virtualized/product lane later if useful. No Go CLI, crypto, real file
I/O or automatic updater belongs in this UI-only cohort.

## Later candidates

2026-10-25: native WinUI MVVM resumed after the session pause. Its interop blocker
is fixed, the native build/model checks pass and actual-window correctness is
recorded in [validation](WinUI3-cs-native-mvvm/VALIDATION.md). It joins the current
implementation cohort; comparative measurements and physical accessibility gates
remain open. The original pause handoff is retained as history.

2026-10-26: Reactor and Flutter now have independent full-screen/workbench
implementations and Release builds. Their build/model/actual-window evidence and
limitations are recorded in [Reactor validation](WinUI3-cs-native-reactor/VALIDATION.md)
and [Flutter validation](Flutter/VALIDATION.md). Reactor remains preview software.
Neither has comparative performance results. All six current implementations
still need a calibrated cross-toolkit measurement cohort and physical AT review.

2026-10-31: Qt and Slint now implement the complete reference, including the
unvirtualized 10k-row workbench, and pass build/model/full actual-window checks.
See [Qt validation](Qt/VALIDATION.md) and [Slint validation](slint-rust/VALIDATION.md).
There are eight implemented candidates; no new comparative timings were run.
Before measuring, disclose Qt's dynamic DLL/plugin delivery, Slint's stock
Windows accent/caption and attribution panel, positional Slint repetition versus
keyed/persistent model identity, and each toolkit's semantic readiness endpoint.
Calibrate actual graphics adapters/presentation and accessibility provider behavior.
The correctness checker now lets native cursor movement reach the event loop
before pressing, records input rectangles and EXE hashes, and scrolls real Slint
controls into view because its AccessKit tree omits fully clipped controls.
These correctness changes do not amend old frozen benchmark cohorts.

The directories `react-native-windows`, `Dear-ImGui-dx11-12` and
`wxWidgets` reserve later independent implementations. They are not benchmarked
by this stage. [Research §13.17](desktop-gui.md#1317-expanded-desktop-candidate-registry-2026-10-24)
records their distinct authoring/rendering models and Reactor's experimental
status. Treat Dear ImGui DX11/DX12 as separate variants with explicit present/idle
policies. Use the same reference contract and disclose any control, list or
accessibility limitations. No overall desktop winner has been measured yet.

## Visual parity revision — 2026-11-05

All eleven candidates are implemented, including React Native Windows, wxWidgets
and Dear ImGui. The earlier reservation paragraph describes the older stage.
Before a new comparative pilot, use the [visual/control parity contract](DESKTOP-VISUAL-PARITY.md):
Svelte is the primary reference and Avalonia fills desktop-specific gaps. Match
controls as far as public framework styling permits; retain stock controls rather
than introducing custom-painted replacements to manufacture pixel identity.

The updated checker records client-area screenshots during idle/progress/filtering,
dialog/workbench/narrow states and actual button geometry. Narrow stacking must
also keep actions inside the client width. Its timings remain correctness-tool
observations, not a calibrated cross-stack performance cohort. Keep remaining
stock palette, scrollbar, dialog, typography and accessibility differences explicit.
Old executable/source freezes do not cover these visual revisions; rebuild and
freeze the final artifacts again before the pilot. Physical AT/IME/high-contrast,
clean-machine and multi-monitor gates remain deferred.

## Measurement preparation — 2026-11-14

- **.NET pin:** the installed SDK is now 10.0.404 (10.0.402/10.0.403 are gone). `global.json` was moved to 10.0.404 for
  Avalonia, both WinUI candidates, `candidate-checks` and Dear ImGui's window checks; those builds and model tests pass.
  The six-host collectors and `WinUI3-webview2` keep their historical pins and results.
- **Rebuilds:** Avalonia, both WinUI candidates, Electron, Tauri, Flutter, Qt, Dear ImGui and React Native Windows were
  rebuilt successfully. **Slint and wxWidgets do not currently compile** (`slint-rust/ui/main.slint:112`,
  `wxWidgets/src/main.cpp:214`); they are excluded until fixed and re-validated.
- **New collector:** [`host-test-support/desktop-measurement/`](host-test-support/desktop-measurement/PROTOCOL.md) uses DXGI
  Desktop Duplication present times as the pixel clock (compositor present, not photon scan-out) and reuses UIA
  readiness as a secondary endpoint. Calibration floor (synthetic window, click to presented frame): median 27 ms.
- **Status:** calibration, per-variant ready references (two recordings each; zero visual noise) and a 24-launch startup
  pilot (ten variants) passed. The measured startup, idle, action and list cohorts have **not** been run, and the action
  and list scenarios are not implemented. A hang found along the way (an orchestrator waiting on a pipe held by a launched
  app, and a settle loop watching whole-desktop frames) was fixed; the rejected attempt is retained.

## Measured cohort — 2026-11-14 (complete)

- **Result:** `desktop-cohort-3`, 557 attempts, 0 failed; startup (20 rounds + 3 warmups, 14 lanes), idle (3 lifetimes + 1
  warmup), interaction (8 lifetimes + 1 warmup, 17 steps including the 1k/10k list workload) for all twelve variants. Tables,
  limits, deviations and the failed-attempt history are in
  [`host-test-support/results/20261114-desktop/RESULTS.md`](host-test-support/results/20261114-desktop/RESULTS.md); factor 5 of
  [CODE-COMPARISON.md](CODE-COMPARISON.md) is re-scored from it.
- **Slint and wxWidgets** were fixed (`main.slint:112` operator spacing; wx `SetSpacer` → `AssignSpacer`) and included. The
  correctness gate also exposed a real wxWidgets wide-layout bug (content cap ignored), fixed in `wxWidgets/src/main.cpp`, and a
  race in the checker's Stop step (now requires the timer to become stable within 1.5 s).
- **Deviations from the approved plan:** capture is DXGI Desktop Duplication rather than Windows.Graphics.Capture; UIA is
  not a timing endpoint for actions and lists (pixel endpoints only; UIA used for startup readiness and target lookup); the
  10/30/60 Hz burst workloads are not measured (below the pixel-change threshold); lean counts (n = 3 idle, n = 8 interaction);
  pilot acceptance was automated plus operator inspection, not an independent review.
- Wide-scope items still deferred: physical AT/IME/high-contrast, clean-machine deployment, multi-monitor, photon scan-out.
