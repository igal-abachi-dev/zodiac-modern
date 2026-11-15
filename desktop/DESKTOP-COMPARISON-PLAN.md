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

## Follow-up 2026-11-15: fixes and targeted re-measurement

- **Fixed:** Avalonia ReadyToRun (startup 1282 -> 784 ms) and sparse list updates (filter typing 1479 -> 597 ms); parallel asset preload in
  Flutter (1603 -> 1495 ms, about 7%). Avalonia model tests now include a randomized equivalence check.
- **Not application defects:** Flutter's startup is the engine (a stock Flutter app shows its window at about 1270 ms on this machine);
  Tauri's fresh-profile cost is first creation of a WebView2 profile and was left at the matched configuration.
- **Left as designed:** the unvirtualized 1k/10k workload (RNW workbench open, web hosts' 10k-row swap). A separate, labeled virtualized lane
  is still the open option, per the list rule above.
- **Method:** new frozen cohort `desktop-cohort-5` (a failed calibration in `desktop-cohort-4` is retained): Avalonia and Flutter changed;
  Tauri, Electron and RNW unchanged as controls; startup n = 20, interaction n = 15, 0 failed attempts. An exploratory Avalonia A/B
  (ReadyToRun x diff) isolated each fix. Details and caveats, including the unreliable 10,000-row step and about 5-9% same-session
  drift: [RESULTS.md](host-test-support/results/20261114-desktop/RESULTS.md).

## Insights and decisions (2026-11-15)

Basis: the seven-factor scores and measured runtime in [CODE-COMPARISON.md](CODE-COMPARISON.md), the first cohort and the follow-up in
[RESULTS.md](host-test-support/results/20261114-desktop/RESULTS.md). One machine, one small screen plus a synthetic list workbench; the
weights assume a small team with Svelte/TypeScript, C# and some Rust/Go experience.

### Final ranking (weighted, 7 factors)

Tauri + Svelte 4.25 · Electron + Svelte 3.80 · WinUI 3 MVVM 3.70 · Avalonia 3.60 · Qt Quick 3.55 · wxWidgets 3.30 · WinUI 3 Reactor 2.80 ·
Flutter 2.70 · Slint 2.60 · React Native Windows 2.50 · Dear ImGui 2.45. Tauri with a bundled WebView2 runtime scores 3.80 and still
ranks first. Measured runtime changed only three cells (Electron 2 to 3, Flutter 4 to 3, Slint 4 to 3) and did not change the top five.

### What the measurements taught

1. **Native is not automatically faster.** Avalonia and Flutter started slowest in the first cohort. Avalonia's was a build setting
   (plain JIT; ReadyToRun gives 1282 to 784 ms). Flutter's is the engine: a stock Flutter app shows its window at about 1270 ms here.
2. **Web hosts are the fastest in use.** Tauri and Electron steps take 12-55 ms (10,000-row swap about 190-200 ms); WinUI and Flutter settle
   at about 400 ms because of control animations; Avalonia steps take 110-250 ms after the list fix.
3. **Tauri's cost is the first launch.** A fresh WebView2 profile adds about 870 ms (1393 versus 510-520 ms retained). Electron has no such
   penalty (about 500-550 ms either way). Memory is not Tauri's strength: 98 MiB over 7 processes, versus 90 MiB over 4 for Electron.
4. **Idle is a non-issue; memory is the idle number.** Every stack read 0.00-0.31% CPU in all five window states. wxWidgets 3 MiB; WinUI, Qt,
   Avalonia, RNW 37-48 MiB; Flutter 66; Electron 90; Tauri 98; Slint 104.
5. **List update strategy matters more than toolkit.** Avalonia's filter typing was 1.5 s because every keystroke replaced the whole list;
   sparse changed-row updates cut it to about 0.6 s. Check how a toolkit's list binding notifies before blaming the toolkit.
6. **The 10,000-row step is a weak measurement** for stacks whose UI thread blocks (Avalonia, React Native Windows, Flutter): one presented
   frame whose time swings from about 2 ms to 1.2 s. Use it only together with the next step, or add an input-latency probe.

### Decision: Tauri or Electron (with Svelte 5 or React)?

**Tauri + Svelte 5 by default.** Measured, the two web hosts are about equal in use and at startup (Electron 501-547 ms, Tauri 510-520 ms
warm), so the choice is about delivery, risk and what you control:

| Pick | When | Cost |
| --- | --- | --- |
| **Tauri** | Default for a Windows-first tool you will ship and maintain | Depends on the installed Evergreen WebView2 (shared, serviced by Windows; a bundled Fixed Version is over 250 MB); about 870 ms first-launch profile cost; you write a thin Rust layer; WebKit/WebView differences on macOS and Linux if you go cross-platform |
| **Electron** | You need Node in-process, native Node modules, a pinned and identical Chromium on every OS, built-in PDF printing, or a VS Code-class extension ecosystem | 358 MiB folder; you own Chromium security updates; 4 processes and 90 MiB at idle |

Keep native calls behind one frontend interface so switching hosts never means rewriting the UI.

**Svelte 5 or React?** Both ran the same measured UI shape; the benchmark did not separate frameworks, so this is judgment, not a
measurement. Choose **Svelte 5** by default (smaller bundle: 115 KB JS here, least glue, runes state, your stated skills). Switch to
**React** only when a required library is React-only (block editors such as BlockNote or Plate, some data-grid and chart components) or the
team already works in React. Do not choose React merely for hiring or popularity on a small team that already knows Svelte.

### Decision: Avalonia or WinUI 3 (when not using WebView2)?

| Pick | When | Cost |
| --- | --- | --- |
| **Avalonia** | You want full control of a custom design, one process in C#, possible macOS/Linux later, or a security-sensitive app with no browser at all | Not Windows controls (Skia-drawn); UI Automation comes through Avalonia's peers (it passed the correctness gate); 105 MiB self-contained, 784 ms start after ReadyToRun; smaller adoption on this PC than WinUI |
| **WinUI 3** | Windows-only, and it should behave like part of Windows (settings-style tools, utilities): Microsoft-serviced Fluent controls, ContentDialog, native UIA and input; a stock look is not the differentiator, Avalonia can match it | 231 MiB self-contained folder (ONNX Runtime and DirectML alone 38.5 MiB; plan to trim), about 400 ms control animations before the UI settles, Windows-only, verbose UI code |

**Both can look like stock Windows Fluent.** In this benchmark both used their own standard Fluent controls (`DESKTOP-VISUAL-PARITY.md`), and
Avalonia's visual result was the closest native one to the reference, so appearance alone is a weak reason to pick WinUI. What differs is
where the controls come from and what you get for free:

| Aspect | WinUI 3 | Avalonia (Fluent theme) |
| --- | --- | --- |
| Control implementation | Real Microsoft controls, serviced through the Windows App SDK; new Fluent controls and fixes arrive from Microsoft | Avalonia's own re-implementation of Fluent; it follows Microsoft's design with some lag, and small differences in details, animation and states remain |
| Windows integration | Native dialogs (`ContentDialog`), text input and IME, UI Automation, system theme and accent, title bar, Windows 11 features first | Follows the system theme and supports the common integration, but through its own peers and platform layer; some native behaviours are approximated; physical assistive technology and IME were not tested for either |
| Platforms | Windows only | Windows, macOS, Linux (and mobile/WebAssembly), same code |
| Size and start | 231 MiB self-contained; 580 ms start; about 400 ms control animations before the UI settles | 105 MiB; 784 ms start (after ReadyToRun); steps 110-250 ms after the list fix |
| Customization | Possible but fights the stock controls (we needed theme-resource overrides to match the custom reference) | Lookless templated controls restyle easily |
| Licence and maturity | Microsoft, free; the Reactor variant is preview | MIT core, independent project |

Native look scored WinUI 5 and Avalonia 4 (15% weight): that reflects control origin and platform behaviour more than pixels. The scores were
not tested against real users or assistive technology.

**Rule of thumb:** if a stock-Fluent look is all you want, **both work**, so decide on the rest. Choose **WinUI 3** when the app is Windows-only
and must behave like part of Windows (system dialogs, IME, accessibility, Microsoft-serviced controls and new Windows features as they ship),
or a stock-look utility where native behaviour matters more than size. Choose **Avalonia** for a custom or branded look, any cross-platform
plan, a smaller footprint or the MIT licence, or the secret-handling path of a security tool. Use WinUI 3 MVVM, not Reactor (preview, 2.80).
In the design-heavy freelancer scenario Avalonia scored 34 against WinUI's 29; in the general table WinUI is slightly ahead (3.70 versus
3.60).

### Decision: Avalonia or Qt Quick?

Neither uses Windows' own controls: both draw their own UI on the GPU (Avalonia on Skia via ANGLE/D3D11; Qt Quick on its own scene graph over
D3D11 here), so this is not "native versus custom". The deciding factors are your language and the kind of app.

| Pick | When | Cost |
| --- | --- | --- |
| **Avalonia** | C# team; business or productivity software (forms, grids, dashboards, workflows); MIT licensing without a legal review; the .NET/NuGet ecosystem; faster development (32.5 KB authored for the reference screen versus 41.1 KB for Qt); a security-sensitive app with no browser in one managed process | No built-in 3D UI or shader effects; media, web view and PDF come from NuGet; 105 MiB self-contained; 784 ms startup after ReadyToRun; smaller adoption on this PC |
| **Qt Quick** | C++ team; media and creative tools (DaVinci Resolve, Avid, DxO, VLC and parts of Photoshop use Qt on this PC); 3D UI and shaders (`Qt Quick 3D`, `ShaderEffect`); embedded or automotive targets; built-in Chromium, PDF, charts, serial and Bluetooth | LGPLv3/GPL or commercial licence (some add-on modules GPL-or-commercial only; static linking has LGPL obligations), so budget a legal review; DLL, QML module and plugin deployment (`qt.conf`, `windeployqt`; clean-machine deployment unverified); C++ linker and DLL-path pitfalls |

Measured here: Qt is 69.2 MiB, about 703 ms startup and about 48 MiB idle; Avalonia is 105.1 MiB, 784 ms (1282 ms before ReadyToRun) and about 48 MiB
idle. Qt is lighter on disk; memory and startup are close. Scores: Qt 3.55 (rank 5; adoption 5, runtime 4, productivity 3, risk 3) against Avalonia
3.60 (rank 4; adoption 3, runtime 3, productivity 4, risk 4). The totals are almost equal, so the language and app type decide, not the numbers.

**Rule of thumb:** a C# team building a business or productivity app should choose **Avalonia**. Choose **Qt Quick** for a C++ team, a media-heavy,
3D or shader-heavy UI, or embedded hardware, and accept the licensing and deployment work. For a team that knows C#, Svelte and some Rust/Go but
not C++, Avalonia is the practical choice; Qt only makes sense if the app type requires it or C++ expertise is added.

### Final recommendation: a default order plus conditional picks

The weighted table (Tauri 4.25, Electron 3.80, WinUI 3 3.70, Avalonia 3.60, Qt 3.55) ranks stacks under declared weights. For a team that knows
Svelte/TypeScript, C# and some Rust/Go, but not C++, the practical order is a default and a runner-up, then a pick by need:

1. **Tauri v2 + Svelte 5**, the default. Use **React** instead only when a required library is React-only (for example BlockNote or Plate block
   editors) or the team already works in React.
2. **Avalonia + MVVM**, the native C# alternative: custom or branded look, one process, MIT, cross-platform if needed, a security-sensitive path with
   no browser. A stock Fluent look is not a reason to choose WinUI 3 over it, because Avalonia's Fluent theme can match it.
3. **Pick by need** (none is a general default for this team):

| Choose | When | What it costs |
| --- | --- | --- |
| **WinUI 3 + MVVM** | A Windows-only utility that must behave like part of Windows: Microsoft-serviced controls, `ContentDialog`, native input/IME and UI Automation, Windows 11 features as they ship | 231 MiB folder (about 400 ms control animations); Windows only. Use MVVM, not Reactor (preview) |
| **Electron + Svelte** | No WebView2 available (locked-down or offline machines); a pinned, identical Chromium on every OS; Node in-process or native Node modules; avoiding a Rust layer; avoiding Tauri's first-launch cost (about 870 ms) | 358 MiB; you own Chromium security updates; about 90 MiB at idle over 4 processes |
| **Qt Quick** | A C++ team; media or creative tools, 3D or shader UI, embedded/automotive, built-in Chromium/PDF/charts/hardware modules | LGPL/commercial review, DLL/plugin deployment, C++ build work. Needs C++ skills this team does not have, which is why it is not third by default |

Why not collapse these into one ranking: WinUI 3 and Electron have real conditions where they win; they just are not the best default for this team. Tauri
still beats Electron on size (4.5 MiB versus 358 MiB), servicing burden and the Rust security boundary, and it is a close call when the app is Windows-only
and the team is comfortable with Rust.

Not recommended now: WinUI 3 Reactor (preview), React Native Windows, Slint, Flutter. Dear ImGui for internal tools only. wxWidgets only when size
dominates.

### Limits on these decisions

- One machine, one small synthetic app; real apps with editors, tables and IPC will stress different paths.
- Physical assistive technology, IME, high contrast, clean-machine deployment and multi-monitor were not tested.
- Pixel times are compositor present times, not photon scan-out. Same-session drift is about 5-9%.
- The 10/30/60 Hz update bursts and the virtualized-list case were not measured.
