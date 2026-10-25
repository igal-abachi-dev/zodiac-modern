# Independent desktop implementations

Updated 2026-10-24. This stage builds and checks applications before running a
new cross-toolkit benchmark. The old six-host WebView2 measurements remain a
separate frozen experiment. Tauri + Svelte is the selected WebView2 representative.

| Current candidate | Stack | Implementation strategy |
| --- | --- | --- |
| `Tauri-v2-Svelte5` | Tauri 2.12.4, Svelte 5.57.2, WebView2 | Own Svelte UI, Nano Stores, Ark, embedded dist |
| `Electron` | Electron 45.0.0, Svelte 5.57.2, bundled Chromium 156 | Independently authored UI/controllers, Svelte runes, Ark, ASAR |
| `Avalonia` | Avalonia 12.1.4, Toolkit 8.4.2, self-contained .NET 10 | Independently authored AXAML/MVVM, Fluent controls, Skia |

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
3. Extend/calibrate the external collector for all three automation/presentation
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

2026-10-24 native WinUI MVVM progress: independent source and passing model
assertions now exist in `WinUI3-cs-native-mvvm`; publication is blocked on
Toolkit MVVMTK0045 partial-property/WinRT compatibility work. The user requested
a pause before actual-window checks. See [the exact handoff](WinUI3-cs-native-mvvm/HANDOFF.md).
It is not yet a built or accepted candidate.

The directories `WinUI3-cs-native-mvvm`, `WinUI3-cs-native-reactor`,
`react-native-windows`, `slint-rust`, `Dear-ImGui-dx11-12`, `Flutter`, `Qt` and
`wxWidgets` reserve later independent implementations. They are not benchmarked
by this stage. [Research §13.17](desktop-gui.md#1317-expanded-desktop-candidate-registry-2026-10-24)
records their distinct authoring/rendering models and Reactor's experimental
status. Treat Dear ImGui DX11/DX12 as separate variants with explicit present/idle
policies. Use the same reference contract and disclose any control, list or
accessibility limitations. No overall desktop winner has been measured yet.
