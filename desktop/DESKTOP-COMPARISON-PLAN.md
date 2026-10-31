# Independent desktop implementations

Updated 2026-10-31. This stage builds and checks applications before running a
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

All implement the [reference feature inventory](Tauri-v2-Svelte5/FEATURE-PARITY.md),
including the complete workbench. Share design/fixture specifications and external
test infrastructure, not runtime UI/state packages or sibling dist directories.
Use local equivalent fonts/icons. Report native text/control differences and
font container formats (TTF versus WOFF2). The Electron renderer intentionally
uses runes instead of copying Tauri's Nano Stores model: results compare practical
whole stacks, not an isolated graphics-engine or language effect.

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
