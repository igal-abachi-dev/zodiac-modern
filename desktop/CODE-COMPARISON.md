# Comparing the eleven desktop implementations

2026-11-14. Source inspection of the eleven independent desktop candidates,
production-artifact sizes measured from the current `out/` (or Flutter `build/`)
folders, the existing validation records, the
[visual-parity pass](DESKTOP-VISUAL-PARITY.md) and the
[installed-apps survey](installed_apps.md). It is the desktop-toolkit counterpart of
the WebView2 frontend [code comparison](webview2-raw-bench/8-framework-test/CODE-COMPARISON.md).

**Evidence boundary.** No new startup, RAM, CPU, frame-time, power or
accessibility cohort was run for this document. The calibrated cross-toolkit pilot
in the [comparison plan](DESKTOP-COMPARISON-PLAN.md) is still open, as are the
physical Narrator/NVDA, IME, OS high-contrast, multi-monitor and clean-machine
gates. Where this document scores runtime efficiency it uses **architecture and
artifact facts**, labelled as expectations; the only measured runtime numbers in
the repository are the 2026-10-24 [six-host WebView2 results](host-test-support/results/2026-10-24/RESULTS.md),
which measured an older Tauri fixture, not these candidates.

**Platform scope: Windows 11 x64 first.** Every build, artifact, renderer note and
score below is for Windows 11. Cross-platform reach is mentioned only as a secondary
benefit; on macOS/Linux several stacks change engine (Tauri uses WebKit there, for
example) and would need their own evaluation.

`Tauri-v2-Svelte5` is the behavior/appearance reference that every other candidate
re-implemented. That makes the comparison fair for "what does it take to rebuild
this screen", but it also biases parity-related observations toward the web stacks:
the specification was written in HTML/CSS terms first.

## Short answer

**Decision (2026-11-14) for your next Windows 11 desktop apps:**

1. **Tauri v2 + Svelte 5 — the default.** Switch the frontend to React only when
   a required library is React-only (for example the BlockNote/Plate block
   editors). Rust owns the narrow native layer.
2. **Avalonia + MVVM (C#) — close second.** The first genuinely different
   alternative: like Tauri it gives **full control over the look**, but it is a
   single-process native app in one language with no browser or IPC bridge.
   Choose it when you want native C#/.NET over a web UI and the app does not
   depend on web-only components. See [Tauri versus Avalonia](#tauri--svelte-versus-avalonia-in-depth).
3. **WinUI 3 + MVVM (C#) — for apps that should behave like part of Windows.** Use it
   for a Windows-only system utility or settings-style tool where Microsoft-serviced
   controls, system dialogs, input/IME and native UI Automation matter. Avalonia's
   Fluent theme can look just as stock, so appearance alone is not the reason;
   the difference is where the controls come from and the platform behaviour.

**Electron is not a separate pick.** It runs the same web UI as Tauri with a
bundled Chromium and Node instead of the system WebView2 and Rust. Keep it only as
an escape hatch (built-in PDF printing, Node native modules, a pinned engine,
identical Chromium on macOS) and keep native calls behind one frontend interface so
switching hosts never means rewriting the UI.

**How this relates to the scores.** The general seven-factor table puts Electron and
WinUI (Electron 3.80 and WinUI 3.70 after the measured-runtime re-score) slightly above Avalonia (3.60). Electron's score is really a second
score for the Tauri UI on a heavier host, and most of WinUI's lead comes from
native look, which counts for little when you want full control of the design. In
the design-heavy freelancer scenario Avalonia (34) is clearly ahead of WinUI (29).
Hence Avalonia is the practical second choice. Flutter scores 3rd in that scenario
because of custom painting, but stays out of the top 3 for its Material-first
Windows conventions, UIA gaps and lack of Windows adoption evidence.

| Situation for your next desktop app | Use | Why |
| --- | --- | --- |
| Default: small/medium Windows tool, your skills, fast iteration | **Tauri v2 + Svelte 5** | Least glue, best text/accessibility foundation, 4.5 MiB EXE, reuse of web/Svelte design work; Rust only for the narrow native layer |
| Windows-only, and native controls, dialogs, input and UIA matter (Avalonia can match the Fluent look) | **WinUI 3 + MVVM (C#)** | Real Microsoft controls, ContentDialog, strongest native integration; plan to trim the 231 MiB self-contained folder |
| Native C# app with full control over a custom design, or cross-platform | **Avalonia + MVVM** (close 2nd overall) | Closest native re-creation of the reference, one language/process, MIT, 105 MiB self-contained (before trimming/AOT) |
| Professional, heavy custom UI, C++ team, cross-platform | **Qt Quick/QML** | Most proven in pro creative tools on this PC; budget for LGPL/commercial review and DLL/plugin deployment |
| Need Node in-process, a pinned Chromium, or VS Code-class web ecosystem | **Electron + Svelte** | Same productivity as Tauri; accept 358 MiB and Chromium servicing |
| Security-sensitive app (passphrases, keys, decryption) | **Avalonia**, then **Tauri with a Rust-owned secret path**, then **WinUI 3** | No browser by construction, or a browser that never sees the secret; see [Security-sensitive apps](#security-sensitive-apps) |
| Tiny native utility, size above all | **wxWidgets** | 6.1 MiB, one EXE, native controls; dated Win32 look and manual layout |
| Internal developer/debug tool, GPU overlay | **Dear ImGui** | 1.1 MiB, very fast to iterate; **no UIA, no bidi shaping** — never user-facing |
| Not recommended now | Reactor, React Native Windows, Slint, Flutter | Preview status, toolchain/font gaps, licence/styling limits or no Windows adoption evidence (details below) |
| Figma-designed "wow" product app (e.g. Linear + Notion + invoicing in one) | **Tauri v2 + web UI** (Electron as fallback; Flutter as the only native contender) | Chromium renders any Figma design; richest editor/grid/chart/drag-and-drop ecosystem; best Hebrew RTL. See [the scenario section](#scenario-a-figma-designed-all-in-one-freelancer-workspace) |

The rest of this document gives the evidence behind that table.

## What the implementations share

All eleven implement the same [reference inventory](Tauri-v2-Svelte5/FEATURE-PARITY.md):
English/Hebrew/emoji fixture, two-second synthetic Encrypt/Decrypt with
Cancel/Reset, a modal About dialog with Escape/Close/focus restoration, responsive
stacking below 760 DIP, and the unvirtualized 1k/10k list/filter workbench with
reverse/splice/update, requested 10/30/60 Hz bursts, Stop and remount. Each owns
its UI, state, timers, assets and build; nothing imports a sibling's runtime code
or `dist`. Every candidate passes its own model tests and the external actual-window
checker at 192 DPI (Dear ImGui through a test-only probe instead of UIA — see
below). None contains Go, cryptography, file I/O or an updater.

## Source-level tradeoffs

| Stack | Authoring model | What renders | State/list strategy | Relative to the Tauri baseline | Professional-app implications |
| --- | --- | --- | --- | --- | --- |
| **Tauri v2 + Svelte 5** (baseline) | Svelte 5 runes + Nano Stores, Ark headless controls, Tailwind CSS | Installed Evergreen WebView2 (Chromium), 7-process tree | Immutable snapshots in a Nano Stores atom; keyed `{#each}` | Reference | Least application glue; web/design reuse. The Rust host carries the **browser hardening** (CSP, navigation/permission/download denial, embedded-asset allowlist). Native features later need typed Tauri commands and capability review |
| **Electron + Svelte 5** | Same Svelte/Ark/CSS model, runes instead of Nano Stores | Bundled Chromium 156 + Node 24 | Plain TS controllers bound with runes; keyed list | Near-identical UI source; hardening moves to `native/main.mjs` (sandbox, contextIsolation, custom protocol, fuses, ASAR) | Same productivity as Tauri without a second language; you own Chromium/Node patching. Biggest payload in the cohort |
| **Avalonia 12** | AXAML + compiled bindings, CommunityToolkit.Mvvm | Avalonia's own Fluent controls via Skia (not WinUI controls) | `[ObservableProperty]`/`RelayCommand` view models; `ItemsControl` + `StackPanel` (unvirtualized) | Imperative breakpoint code, custom in-window dialog overlay, hand-converted icon geometry | Mature MVVM with good testability; cross-platform; visual result closest to the reference among native stacks |
| **WinUI 3 + MVVM** | WinUI XAML + `x:Bind`, Toolkit MVVM | Native WinUI 3 / Windows App SDK 2.5.1 controls | Toolkit view models + dispatcher clock adapter; unvirtualized `ItemsControl` | Most verbose UI (XAML + code-behind); P/Invoke for DPI client sizing; theme-resource overrides to tame Fluent defaults | Real Windows controls and dialogs; Windows-only; heavy self-contained deployment |
| **WinUI 3 + Reactor** | C# components/hooks/reducers (MVU) | Same native WinUI controls | Pure reducers + `Pulse` timer; keyed rows inside a `SemanticPanel` | Compact C#-only UI; but preview analyzers, DPI P/Invoke, visual-tree lookup for focus | React-like authoring with native controls; **0.1.0-preview** API and support risk |
| **Flutter 3.47** | Dart widgets, stock Material 3 | Flutter engine (own renderer) in a generated C++ Win32 runner | Dart controllers, immutable rows; every row built (no `ListView.builder`) | Single large `main.dart`; `Semantics` wrappers; `FontLoader`; `flutter_svg` package | Excellent custom-UI tooling and hot reload upstream; Material, not Fluent; no Windows adoption evidence on this PC |
| **Qt 6.12 Quick/QML** | QML + typed C++20 controller | Qt Quick scene graph, RHI Direct3D 11 | `QAbstractListModel` + `QSortFilterProxyModel`, persistent indexes on reverse | Declarative QML is pleasant; C++ adds startup diagnostics, verified-adapter readiness, app-local CRT, `windeployqt` | Strongest pro-tool pedigree; licensing (LGPL/GPL/commercial) and DLL/plugin deployment need deliberate work |
| **Slint 1.18 + Rust** | `.slint` declarative UI + Rust models | Slint Skia renderer via Winit; AccessKit | `VecModel`; repetition reuses widgets **by position**, not by key | Smallest authored UI file; duplicated `if narrow:` layouts; no Dialog role; required AboutSlint panel | Compiles to a single EXE; small ecosystem; stock Fluent accent/caption follow the OS; royalty-free licence requires attribution |
| **React Native Windows 0.85** | React 19 TSX + `useReducer`, RN primitives | Fabric / Windows Composition (not WinUI XAML controls), Hermes bytecode | Local React state; memoized keyed rows in a `ScrollView` (all mounted) | Smallest UI source; largest **toolchain** (Node, Metro, Hermes, MSBuild, NuGet, PowerShell 7 tool) and build fixes | React skills transfer, but **no local custom fonts** in this release (Segoe UI only), icons rasterized to PNG |
| **wxWidgets 3.2** | Imperative C++20 + sizers | Native Win32 common controls (wxMSW) | Eager `wxListCtrl` report mode; structural changes rebuild items | Manual sizer orientation swaps and per-resize text `Wrap()` widths; native dialog for free | Tiny native output; classic Win32 look (borders, gauge, scrollbars) cannot reach the Fluent/web appearance without owner drawing |
| **Dear ImGui 1.93 DX12/DX11** | Immediate-mode C++ | Its own draw lists on hand-written DX12/DX11 backends | Plain C++ state; every matching row submitted each frame, no clipper | Hand-positioned coordinates per breakpoint × DPI; owns swap chains, fences, fallback, redraw policy; test probe replaces UIA | Fastest edit-compile loop for tools; **no UIA provider, no bidi/complex shaping, monochrome emoji** |

## Rendering engines on Windows 11

Every candidate is still a Win32 process with an HWND; what differs is **who draws
the pixels and which Windows graphics API they reach**. "Detected" below means
found in this repository's shipped files/binaries or build configuration; other
details are upstream architecture. The actual GPU adapter/API at runtime is only
verified for Qt and Dear ImGui so far (RTX 2070 SUPER, hardware) — record it for
the rest before any graphics comparison.

### Per-stack pipeline

| Stack | Pipeline on Windows 11 | Text engine | Windows GPU API | Software fallback | Evidence |
| --- | --- | --- | --- | --- | --- |
| Tauri (WebView2) | Blink layout → Skia raster → Chromium Viz compositor in the **shared Edge WebView2 GPU process**; WRY hosts the controller in a child HWND | HarfBuzz shaping, DirectWrite fonts, color emoji (COLR/CBDT) | ANGLE → **Direct3D 11**; DirectComposition | Chromium software/SwiftShader paths in the runtime | 7-process tree measured earlier; runtime 155.0.4283.62 |
| Electron | Same Blink → Skia → Viz design, but a **private bundled Chromium 156** with its own GPU process | Same as above | ANGLE → D3D11; `dxcompiler.dll` for D3D12/WebGPU (Dawn) paths | `vk_swiftshader.dll` (CPU Vulkan) | Detected: `d3dcompiler_47`, `dxcompiler`, `vk_swiftshader`, `vulkan-1` |
| Avalonia | Avalonia's retained visual tree → compositor → **SkiaSharp** | HarfBuzzSharp shaping + Skia glyphs | ANGLE (GLES) → **D3D11** | Skia CPU raster | Detected: `libSkiaSharp`, `libHarfBuzzSharp`, `av_libglesv2` |
| WinUI 3 (MVVM, Reactor) | XAML visual tree → **WinAppSDK `Microsoft.UI.Composition`** (same compositor family as the Windows shell) | DirectWrite / DWriteCore, ClearType-quality text | D3D11 + Direct2D via composition; DirectComposition to DWM | WARP (D3D software) | `Microsoft.ui.xaml.dll`, App SDK composition DLLs in the folders |
| React Native Windows | React → Fabric shadow tree (Yoga layout) → **Windows Composition visuals** (not XAML controls) | DWriteCore | Composition (D3D11) | WARP | Detected: `Microsoft.UI.Composition.OSSupport`, `DWriteCore.dll`, Hermes |
| Flutter | Widget → render tree → layer tree → **Flutter engine** (Skia, with Impeller in the same engine binary) | Flutter's own paragraph engine (SkParagraph/HarfBuzz-based) | ANGLE → **D3D11** | Software rendering mode | `flutter_windows.dll` contains Skia, Impeller and ANGLE code; which renderer is active in 3.47.8 on Windows is **not yet recorded** |
| Qt Quick/QML | QML items → **Qt Quick scene graph** (batched, retained) → **RHI** | Qt text layout with HarfBuzz shaping; native or distance-field glyphs | Explicitly **D3D11** here; RHI also supports D3D12/Vulkan/OpenGL | Software scene graph / WARP — rejected by this app's policy | Configured and runtime-verified hardware D3D11 |
| Slint | `.slint` element tree → **Slint Skia renderer** via Winit | Skia text shaping | Skia GPU surface (D3D entry points and an OpenGL/WGL path are compiled in) | `tiny-skia` CPU path in the dependency graph | Binary contains `D3D12CreateDevice` and WGL symbols; active surface not recorded |
| wxWidgets | **Classic Win32**: one HWND per control, USER32/comctl32 v6, uxtheme visual styles | GDI / Uniscribe in native controls | **None required** (GDI is CPU-drawn; DWM composites the window) | n/a — works anywhere | Links only `wx::core` + `gdi32` |
| Dear ImGui | Your loop builds vertex/index buffers each frame → **your own DX12 or DX11 backend** | `stb_truetype` font atlas; no shaping, no bidi | **Direct3D 12** default, D3D11 fallback, chosen by our code | D3D11 **WARP** (opt-in) | Links `d3d11 d3d12 dxgi d3dcompiler`; validation records hardware adapter |

### Engine families: pros and cons

| Family | Stacks | Pros | Cons |
| --- | --- | --- | --- |
| **Chromium / Blink** (WebView2 shared, or Electron bundled) | Tauri, Electron | The most expressive design engine on the platform: CSS grid/flex, gradients, shadows, `backdrop-filter`, masks, variable fonts, SVG, Canvas/WebGL/WebGPU, GPU-composited animations. Best text: bidi, complex scripts, color emoji, IME. Full accessibility tree. Same engine as the web, so designers' CSS from Figma Dev Mode transfers | Multi-process (GPU, renderer, utility); higher baseline memory; on-disk browser profile; huge DOMs need virtualization; you own browser hardening. WebView2 is shared and serviced by Windows (version drift); Electron is private and serviced by you |
| **Skia toolkits** | Avalonia, Flutter, Slint | One renderer you fully control: custom-painted controls, consistent pixels, shaders/effects, single process, cross-platform identical look | Controls are re-implementations, not Windows controls: platform behaviors (scrolling feel, text input, accessibility) come through the toolkit's bridges; Skia adds ~10–20 MB; ANGLE/driver issues surface as toolkit bugs |
| **Windows Composition** | WinUI 3 (MVVM, Reactor), RNW | The OS's own compositor: native Fluent controls, Mica/Acrylic, independent (off-UI-thread) composition animations, DirectWrite text identical to Windows apps | Windows-only; breaking away from the Fluent look means re-templating controls; RNW draws its own primitives on top of it and lags on fonts |
| **Qt RHI scene graph** | Qt Quick | Retained GPU scene graph with batching, shader effects (`MultiEffect`, `ShaderEffect`), smooth animations, choice of D3D11/D3D12/Vulkan/OpenGL, mature text | Own controls (Fluent-like styles exist, not native); large DLL/plugin deployment; licensing |
| **Classic Win32 / GDI** | wxWidgets | Lightest and most robust: no GPU dependency, fine over RDP/VMs, instant native behavior and accessibility | CPU-drawn, HWND-per-control, no modern effects or animations, very limited theming — looks like Windows 7-era controls |
| **Immediate mode on raw Direct3D** | Dear ImGui | Total control and minimal overhead; redraws only when needed (our policy); ideal for tools and GPU visualizations | You are the toolkit: no UIA, no shaping/bidi, basic text input only; layout by coordinates; you own device loss, swap chains and DPI |

**DirectX 11 versus 12.** D3D11 is driver-managed and the target of ANGLE, so every
browser/Skia/Flutter path above lands on it. D3D12 is explicit: lower CPU overhead
and finer control, but the application owns memory, synchronization and
residency (our ImGui `graphics.cpp` spends 360 lines on the two backends). For 2D UI the
difference rarely decides anything; robustness and fallback do. Over RDP or in VMs
expect fallback to WARP, SwiftShader or CPU Skia — always log which path ran.

## What each stack needed beyond the Svelte baseline

The Svelte reference got these from the browser almost for free: CSS media queries,
`@font-face`, `<img>` SVGs, an accessibility tree from semantic HTML/ARIA, DPI
scaling, IME/bidi text, and Ark's dialog focus trap. Every desktop stack had to
supply them another way. Conversely, the reference needed browser-specific work
the native stacks do not: CSP, navigation/permission/download policy, an embedded
asset allowlist and an Ark inline-style exception (about 13 KB of Rust host code).

| Stack | Responsive layout | Dialog + focus | Accessibility / UIA | Fonts | Icons | Readiness, DPI, other native work |
| --- | --- | --- | --- | --- | --- | --- |
| Tauri (baseline) | One CSS `@media` block | Ark `useDialog` (trap, restore, Escape) + `inert` | Semantic HTML, `role=status`, `aria-live`; Chromium exposes UIA | WOFF2 via `@font-face` | `<img>` SVG, CSS filter for white | `document.fonts` + two rAFs; browser does DPI. **Extra:** CSP/policy/asset allowlist in Rust |
| Electron | Same CSS | Same Ark | Same | Same | Same | **Extra:** main-process session/protocol policy, fuses, ASAR packaging script |
| Avalonia | `ArrangeCards()` rewrites Grid rows/columns on `SizeChanged` | Custom in-window overlay; manual focus + Escape handler | `AutomationProperties` names/IDs; automation peers | WOFF2→TTF conversion script + provenance | Lucide paths converted to XAML `Path` geometry (`LucideIcon.cs`) | `RequestAnimationFrame` ×2 for Ready |
| WinUI MVVM | `Responsive()` rebuilds Grid definitions; custom `WrapPanel` for toolbar | Native `ContentDialog`; walks the visual tree to tag the Close button's AutomationId; trigger gated until close | `AutomationProperties`; off-screen controls report no bounds (checker scrolls) | `ms-appx` TTF font URIs | Same `Path`-geometry control | `CompositionTarget.Rendering` ×2; **P/Invoke `GetDpiForWindow`** to size a 960×640 DIP client; theme resources (`ProgressBarTrackHeight` etc.) override Fluent defaults |
| Reactor | Breakpoint from **P/Invoke** client rect/DPI (device-pixel bug found at 200%) | Controlled Reactor `ContentDialog` (imperative `ShowAsync` rejected by analyzer); focus via render callback | Per-element `AutomationName/Id`; **`SemanticPanel` needed** for the row group; one recovered UIA timeout | Same | `SvgImageSource` + white SVG variant | Resource writes during `Render` broke readiness and were removed; `ApplyStyle` only |
| Flutter | `LayoutBuilder` breakpoints | Material `showDialog` | `Semantics` wrappers; `identifier` not exported as UIA AutomationId on Windows (checker uses names/roles) | `FontLoader` before `runApp` | `flutter_svg` package + color filter | First-frame window show; fixed `VisualDensity` (default density shrank 40 px buttons); generated C++ runner |
| Qt | QML property bindings on width | QML Basic dialog/popup | `Accessible.*`, contrast-palette hints, polite announcements, accessible edits synced to model | `QFontDatabase::addApplicationFont` from qrc | qrc SVG via `Image` | Ready after fonts + frame callbacks + **verified hardware D3D11 adapter**; startup diagnostics/watchdog; app-local CRT, `qt.conf`, `windeployqt` |
| Slint | Duplicate `if narrow:` layout branches + coordinate math | `FocusScope` overlay; **no public Dialog role** → named group | `accessible-*` props; AccessKit omits fully clipped controls | Compiled-in TTFs | `@image-url` SVG + colorize | Ready after show + event-loop turn (no AfterRendering notifier on this Skia build); AboutSlint attribution required |
| RNW | `onLayout` width state (`useWindowDimensions` went stale after resize) | RN `Modal` + rAF focus | `accessibilityRole/LiveRegion/Value/Hint`; two recovered UIA gaps | **Not possible** in this release: system Segoe UI | SVG → 96 px PNG (built with the wx tool) + `tintColor` | Two-frame Ready; MSBuild/NuGet/Hermes fixes (SDK target, runtime staging, BOM, fail-closed bundle) |
| wxWidgets | Sizer orientation swaps + manual `Wrap()` widths recomputed every resize + scroller virtual size | Native `wxDialog` | Native Win32 control accessibility | `AddFontResourceEx(FR_PRIVATE)` with RAII | `wxBitmapBundle::FromSVGFile` | PerMonitorV2 manifest, `FromDIP` everywhere; static wx built from source |
| Dear ImGui | Hand-set coordinates with per-breakpoint Y offsets × DPI | `BeginPopupModal` + manual focus/Escape | **None.** Test-only snapshot probe instead of UIA | `AddFontFromMemoryTTF` + merged Segoe UI Emoji, 32-bit chars | Lucide **icon font** subset via Python/FontTools | `WM_DPICHANGED`, manual DPI scaling, on-demand redraw loop; DX11/DX12 swap chains, fences, fallback, device-loss (~15.5 KB) |

Patterns worth carrying into any future native app:

- **Responsive layout is the largest hidden cost of leaving CSS.** Every XAML/C++
  stack wrote imperative breakpoint code; wx and ImGui also hand-managed wrapping
  or coordinates. QML, Flutter's `LayoutBuilder` and Slint conditionals were the
  most declarative native options.
- **Accessibility is per-toolkit engineering, not a checkbox.** Reactor needed a
  semantic container, Flutter's identifiers don't reach UIA, Slint lacks a Dialog
  role and hides clipped controls, ImGui has nothing. Only the browser stacks,
  WinUI and wx got a complete tree without special work.
- **Fonts/icons are a pipeline.** Natives needed WOFF2→TTF conversion with
  provenance; icons became XAML geometry, SVG images, PNGs or an icon font
  depending on what each toolkit can draw.
- **"Ready" means something different everywhere.** Two-frame callbacks, font
  loading, verified GPU adapters, first-frame window show — calibrate before any
  startup comparison.
- **DPI is explicit in Win32-close stacks.** WinUI/Reactor needed P/Invoke; wx and
  ImGui need manifests, `FromDIP`/manual scaling and `WM_DPICHANGED`.

## Metrics

### Authored source bytes

Bytes, not lines: several projects use very long lines (the Svelte `App.svelte` is
6 lines / 4 KB). UI = markup, styles and view code; State = domain/view-model;
Host = native shell/glue. Build scripts, notices, licences and lockfiles excluded.
Raw size is a weak proxy for maintainability — read it with the table above.

| Stack | UI | State | Host / native glue | Tests | Authored total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tauri + Svelte | 18.1 KB | 7.1 KB | 13.4 KB (Rust policy/assets) | 5.0 KB | **38.6 KB** |
| Electron + Svelte | 16.5 KB | 4.6 KB | 7.4 KB (main/policy/package) | 7.4 KB | **28.5 KB** |
| Avalonia | 20.7 KB | 9.9 KB | 1.9 KB | 2.6 KB | **32.5 KB** |
| WinUI MVVM | 26.8 KB | 9.6 KB | 1.4 KB | 2.4 KB | **37.8 KB** |
| WinUI Reactor | 17.2 KB | 5.0 KB | 2.0 KB | 1.4 KB | **24.2 KB** |
| Flutter | 25.6 KB | 4.0 KB | 20.6 KB generated runner | 3.4 KB | **29.6 KB** + template |
| Qt | 16.7 KB | 11.6 KB | 12.8 KB (startup/diagnostics) | 3.2 KB | **41.1 KB** |
| Slint | 13.2 KB | 5.1 KB (+inline tests) | 8.6 KB (Rust wiring) | inline | **26.9 KB** |
| React Native Windows | 13.6 KB | 2.0 KB | 6.1 KB template-derived shell/Metro | 1.5 KB | **15.6 KB** + template |
| wxWidgets | 20.2 KB (UI + controllers) | 2.0 KB | 1.1 KB | 1.3 KB | **23.3 KB** |
| Dear ImGui | 22.3 KB | 3.7 KB | 27.5 KB (Win32 + DX11/DX12) | 1.9 KB | **53.5 KB** |

Reading: the web stacks spend bytes on security policy; XAML stacks on verbose
markup and layout code; Qt on diagnostics; ImGui on owning a graphics backend.
RNW and Reactor are compact in source but paid in toolchain and preview friction.

### Production artifacts (measured 2026-11-14)

Whole runnable folder, excluding PDB debug symbols. File sizes, not RAM.

| Stack | Folder | Files | Main binary | Largest components | Runtime prerequisites |
| --- | ---: | ---: | ---: | --- | --- |
| Tauri + Svelte | **4.5 MiB** EXE (assets embedded; dist 215 KB, 115 KB JS) | 1 | 4.5 MiB | — | Installed **Evergreen WebView2** (shared). A bundled Fixed Version runtime is >250 MB unpacked per Microsoft |
| Electron + Svelte | **357.7 MiB** | 73 | 238.2 MiB | `dxcompiler.dll` 25.8 MB, `resources.pak`, ICU | None (ships Chromium + Node) |
| Avalonia | **105.1 MiB** | 222 | apphost | CoreLib 16 MB, SkiaSharp 11.6 MB, ANGLE 5.4 MB | None (self-contained .NET 10, ReadyToRun since 2026-11-15, untrimmed; size not re-measured) |
| WinUI MVVM | **231.2 MiB** | 529 | apphost | Windows SDK projection 26 MB, **onnxruntime + DirectML 38.5 MiB**, CoreLib, `Microsoft.ui.xaml.dll` 15 MB | None (self-contained .NET + Windows App SDK) |
| WinUI Reactor | **235.7 MiB** | 548 | apphost | Same as MVVM | Same |
| Flutter | **28.0 MiB** | 30 | small runner | `flutter_windows.dll` 21.3 MB, AOT `app.so` 5.4 MB | **Microsoft VC++ runtime** |
| Qt | **69.2 MiB** | 165 | small | `dxcompiler.dll` 14 MB, Qt6Core/Gui/Quick/Qml | None (app-local CRT + qt.conf; clean VM unverified) |
| Slint | **25.3 MiB** | 6 | 21.3 MiB (Skia inside) | 4 MB notices file | None |
| React Native Windows | **164.5 MiB** | 790 | small | `hermes-icu` 36.6 MB, **onnxruntime + DirectML**, `Microsoft.ui.xaml`, `Microsoft.ReactNative` | None (app-local WinAppSDK/CRT) |
| wxWidgets | **6.1 MiB** | 22 | 5.8 MiB | fonts/icons | None (static wx + CRT) |
| Dear ImGui | **1.1 MiB** | 19 | 0.9 MiB | fonts | None (D3D from Windows) |

Notes: the WinUI/Reactor/RNW folders carry ~38.5 MiB of ONNX Runtime/DirectML
pulled in by the Windows App SDK graph that this UI never uses; trimming, Native
AOT or ReadyToRun would be separately labelled delivery variants and are untested
here. Avalonia also has an untested trimming/Native AOT route. Electron and the
WebView2 runtime both put patch responsibility somewhere: Electron on you, Evergreen
WebView2 on Windows Update (with version drift you don't pin).

### Toolchains, dependencies and licences

| Stack | Languages you write | Build toolchain | Locked package graph | Licence starting point |
| --- | --- | --- | --- | --- |
| Tauri | TS/Svelte, CSS, Rust | Node 24, pnpm, Rust, MSVC build tools | 275 npm (mostly build-time) + 408 crates | MIT/Apache-2.0 |
| Electron | TS/Svelte, CSS, JS | Node 24, pnpm, Electron Packager | 315 npm | MIT + Chromium/Node notices |
| Avalonia | C#, AXAML | .NET SDK 10 | 49 NuGet | MIT |
| WinUI MVVM | C#, XAML | .NET SDK 10, WinUI/Windows SDK build tools | 35 NuGet | MIT source; runtime package terms |
| Reactor | C# | .NET SDK 10, WinUI build tools | 44 NuGet (preview package) | MIT, preview |
| Flutter | Dart (C++ runner generated) | Flutter SDK, VS C++/CMake | 38 pub | BSD-3 + engine notices |
| Qt | QML, C++20 | Qt 6.12 kit (Python acquisition), clang-cl, CMake/Ninja, MS linker | Prebuilt Qt kit | LGPL/GPL or commercial — needs review |
| Slint | Slint, Rust | rustup 1.99.1, Cargo, Skia prebuilt | 534 crates | Royalty-free 2.0 with attribution, GPL or commercial |
| RNW | TSX, C++ shell | Node, npm, Metro, Hermes, MSBuild, NuGet, PowerShell 7 tool, VS v145 | 719 npm + 51 NuGet | MIT |
| wxWidgets | C++20 | clang-cl, CMake/Ninja, wx source build | Source archive | wxWindows Licence (permissive) |
| Dear ImGui | C++20 | clang-cl, CMake/Ninja; Python/FontTools for icons | Source archive | MIT |

Iteration loop (upstream capabilities, **not exercised or timed here**): Vite HMR
for Tauri/Electron renderers, Flutter stateful hot reload, Metro fast refresh for
RNW debug, Slint live preview, XAML designers/Hot Reload for Avalonia/WinUI, QML
reload tooling; wx and ImGui are edit-compile-run (ImGui's loop is short). Tauri's
recorded first Release build was ~2m50s; Qt/wx/Slint first builds also include
large SDK/source/Skia setup. These are logs, not build benchmarks.

### Validation friction (from each VALIDATION.md)

| Stack | Notable corrections before acceptance |
| --- | --- |
| Tauri | One transient UIA provider retry; otherwise reference |
| Electron | Checker waits for async dialog/navigation; runtime probe focus handling |
| Avalonia | Checker hit title-bar Close; input before layout settled; font weight/icon/spacing fixes |
| WinUI MVVM | Sealed Viewbox + MVVMTK0045 compile fixes; ContentDialog Close ID; off-screen bounds; focus waits |
| Reactor | Analyzer forced controlled dialog; SemanticPanel; DPI device-pixel bug; resource-rewrite readiness failure; 10k UIA scan timeouts |
| Flutter | UIA identifiers missing; modifier scan codes; committed Stop state; VS installation detection |
| Qt | Implicit lld-link; Qt DLL path for tests; later diagnostics/CRT/accessibility follow-up |
| Slint | No AfterRendering notifier (stuck Loading); cursor-move timing; clipped controls missing from AccessKit |
| RNW | Modifier timing; real queued-tick Stop race; stale window dimensions; four build-pipeline fixes |
| wxWidgets | Missing DPI manifest; costly UIA list searches; Stop after natural completion |
| Dear ImGui | 1.93 API updates; emoji glyph merge; probe file-IO protocol failures |

Many of these are checker or platform-learning corrections, not toolkit defects —
but they are a fair signal of how much platform knowledge each stack demands.

## Industry adoption on this PC (installed_apps.md)

| Stack family | Apps detected/known on this machine | Reading |
| --- | --- | --- |
| **Qt** | DaVinci Resolve (Qt 5), Avid Media Composer (Qt 6), DxO PureRAW (Qt 6), VLC, qBittorrent, OnionShare (PySide6), Photoshop (QApplication), InDesign, Mocha plugin in After Effects/Media Encoder | Dominant in professional media/creative tools |
| **Electron** | Cursor, Postman, Claude, ChatGPT/Codex, chaiNNer; an Electron component inside Resolve | Dominant in developer and AI tools that ship fast |
| **WebView2 shells / Tauri family** | Stremio (Rust + WebView2), Epic launcher preview (Tauri, per community reports); WebView2 panes in Office, Acrobat, Foxit, Visual Studio, OneDrive, PowerToys, Capture One, Beyond Compare, MediaInfo, Zoom | WebView2 is everywhere as a pane; full-app Rust/WebView2 shells are newer |
| **WinUI 3 / XAML** | Notepad (C++ WinUI 3), PowerToys, WinUI bundled in Office/OneDrive/DxO; XAML lineage in Calculator, Settings, Photos, Store, Terminal | Microsoft's own direction for new Windows UI |
| **WPF** (same C#/XAML skills) | Visual Studio, Capture One, SourceTree, EarTrumpet, JetBrains dotPeek | Established .NET desktop base |
| **Avalonia** | ReSharper (30 Avalonia assemblies), VS Git credential helper | Used by serious .NET tool vendors |
| **Dear ImGui** | ImHex | Developer tools |
| wxWidgets, Flutter, Slint, RNW, Reactor | None detected | No local evidence; RNW is known to be used inside some Microsoft products but was not detected here |

Prevalence on one PC is not proof of fitness, but it is the best available
signal for "can a serious product ship and be maintained on this stack".

## Seven-factor ranking

### Factors and weights

Weights are declared before scoring and reflect **your next small/medium Windows
desktop apps, built by a small team with Svelte/TypeScript, C# and some Rust/Go
experience**. Change the weights for a different team or product.

| # | Factor | Weight | Evidence used |
| --- | --- | ---: | --- |
| 1 | Production adoption & maturity | 15% | installed_apps.md, release status |
| 2 | Windows-native look & integration | 15% | Visual-parity pass, control type, chrome/accent behaviour |
| 3 | Accessibility & international text | 15% | UIA tree quality/corrections, bidi/emoji/IME foundation (physical AT still untested) |
| 4 | Footprint & delivery | 15% | Measured folders/files, runtime prerequisites, servicing burden |
| 5 | Runtime efficiency (**measured 2026-11-14**) | 10% | Startup, idle memory and input response from `host-test-support/results/20261114-desktop/RESULTS.md`; weight left at 10% because the workload is one small screen |
| 6 | Developer productivity & reuse | 20% | Glue code, layout/a11y work needed, toolchain friction, iteration loop, web reuse |
| 7 | Ecosystem, licensing & long-term risk | 10% | Licence obligations, preview status, component/hiring pool |

### Scores (1 = weak, 5 = strong)

| Stack | 1 Adopt | 2 Native | 3 A11y/i18n | 4 Delivery | 5 Runtime* | 6 DX | 7 Risk | **Weighted** | Rank |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | ---: | :-: |
| Tauri + Svelte | 4 | 3 | 5 | 5† | 3 | 5 | 4 | **4.25** | 1 |
| Electron + Svelte | 5 | 3 | 5 | 1 | 3↑ | 5 | 4 | **3.80** | 2 |
| WinUI 3 MVVM | 4 | 5 | 5 | 2 | 3 | 3 | 4 | **3.70** | 3 |
| Avalonia | 3 | 4 | 4 | 3 | 3 | 4 | 4 | **3.60** | 4 |
| Qt Quick/QML | 5 | 3 | 4 | 3 | 4 | 3 | 3 | **3.55** | 5 |
| wxWidgets | 2 | 3 | 4 | 5 | 5 | 2 | 3 | **3.30** | 6 |
| WinUI 3 Reactor | 1 | 5 | 4 | 2 | 3 | 3 | 1 | **2.80** | 7 |
| Flutter | 1 | 2 | 3 | 4 | 3↓ | 3 | 3 | **2.70** | 8 |
| Slint | 1 | 2 | 3 | 4 | 3↓ | 3 | 2 | **2.60** | 9 |
| React Native Windows | 2 | 3 | 3 | 2 | 3 | 2 | 3 | **2.50** | 10 |
| Dear ImGui | 2 | 1 | 1 | 5 | 4 | 2 | 3 | **2.45** | 11 |

\* **Factor 5 is now measured** (see "Measured runtime" below). The earlier estimate is kept
for the unchanged cells; ↑/↓ mark the three cells the measurements contradicted
(Electron 2→3, Flutter 4→3, Slint 4→3). The top of the ranking does not change.
† Assumes installed Evergreen WebView2. With a bundled Fixed Version runtime
(strict offline, no-runtime-install delivery) score Delivery 2: Tauri drops to
**3.80** and still ranks first.

### Measured runtime (2026-11-14)

One machine (Windows 11, 3840x2160 at 200%, RTX 2070 SUPER), the same reference screen and workbench in every stack, 557 attempts with no failures. Full method, limits and per-step tables: `host-test-support/results/20261114-desktop/RESULTS.md`. Times are compositor present times, not photon scan-out; idle and interaction use only 3 and 8 lifetimes, so small differences are unresolved.

| Stack | Startup to settled UI, ms (median, n=20) | Idle private working set, MiB | Processes | Interaction character |
| --- | ---: | ---: | ---: | --- |
| React Native Windows | 349 | 48 | 1 | Fast start; slow workbench open (~1 s) and remount |
| wxWidgets | 369 | 3 | 1 | Light and snappy; About open ~300 ms |
| Electron | 501 (fresh = retained) | 90 | 4 | Fastest steps (15-55 ms) except 10k rows (~200 ms) |
| Dear ImGui DX11 / DX12 | 506 / 565 | 44 / 74 | 1 | Uniform ~40-90 ms, no animation tail |
| Tauri + Svelte (retained profile) | 520 | 98 | 7 | Fastest steps (12-50 ms) except 10k rows (~190 ms) |
| Tauri + Svelte (**fresh profile**) | **1393** (p95 1609) | 98 | 7 | The first-run WebView2 profile costs ~870 ms |
| WinUI 3 MVVM | 580 | 37 | 1 | ~400 ms settle from control transitions; first change 5-45 ms |
| Slint | 644 | 104 | 1 | ~175 ms tail on every step |
| WinUI 3 Reactor | 657 | 40 | 1 | Like MVVM; ~400 ms settle |
| Qt Quick | 703 | 48 | 1 | Fast about/reset; list swaps 200-500 ms |
| Avalonia | 1282 first run; **784 after ReadyToRun** | 48 | 1 | First run: JIT start, filter typing ~1.5 s. After the follow-up fixes: filter typing ~0.6 s, splice/update ~115 ms |
| Flutter | 1603 first run; 1495 after a preload tweak | 66 | 1 | Slowest start, and it is the engine: a stock Flutter app is as slow to show a window (~1270 ms); ~400 ms settle |

What this changes:

- **Tauri's runtime is good, not best.** Its steps are the fastest measured and idle memory is modest (98 MiB across 7 processes), but it is not the lightest and **a fresh WebView2 profile adds about 870 ms** to first launch. A Tauri app that cares about first-run feel should keep the profile warm or show a native splash.
- **Electron is better than expected** at startup (501 ms, no fresh-profile penalty) and about as quick as Tauri in use; its cost is delivery size (357.7 MiB) and 90 MiB over 4 processes, not speed. That narrows Tauri's runtime lead to memory and process count only.
- **Native single-process stacks are not automatically faster.** Avalonia (1282 ms on the first run) and Flutter (1603 ms) started slowest. Avalonia's was a build setting, not the toolkit: ReadyToRun brought it to 784 ms (see the follow-up below). Flutter's is the engine itself on this machine; Slint carries the largest idle footprint among the natives (104 MiB); WinUI 3 settles slowly because of its control transitions. wxWidgets and Dear ImGui are the lean ones, at the cost of the factor 2, 3 and 6 scores above.
- **Nothing was busy while idle.** All twelve variants read 0.00-0.31% CPU (one timer tick) in visible, unfocused, occluded, minimized and restored states, so idle memory is the useful idle number.

#### Follow-up fixes and re-measurement (2026-11-15)

The slow spots from the first run were investigated, fixed where the cause was in the application, and re-measured in a new frozen cohort (Avalonia and Flutter rebuilt; Tauri, Electron and React Native Windows unchanged as controls; startup n = 20, interaction n = 15; same-session drift about 5-9%). Details, caveats and data: `host-test-support/results/20261114-desktop/RESULTS.md` ("Follow-up 2026-11-15").

| Problem | Verdict | Before -> after (median) |
| --- | --- | --- |
| Avalonia startup | **Fixed**: ReadyToRun (plain JIT was the cause; A/B-confirmed) | 1282 -> 784 ms |
| Avalonia filter typing | **Fixed**: sparse list updates instead of replacing every row on each keystroke (A/B-confirmed) | 1479 -> 597 ms; filter-clear 547 -> 125, splice 260 -> 115, update 224 -> 116. Remount rose about 200 -> 290 ms (cause not found) |
| Flutter startup | **Not an app problem**: a stock Flutter app shows its window at about 1270 ms on this machine too; parallel asset preload gained ~7% | 1603 -> 1495 ms |
| Tauri fresh-profile first launch | **Not fixed**: first creation of a WebView2 profile; the host is deliberately kept at the matched configuration, no flags changed | 1393 -> 1394 ms (retained 510 ms) |
| RNW workbench open; Tauri/Electron 10k-row swap | **Left as designed**: the unvirtualized stress workload is a parity rule; a separate labeled virtualized lane would be the way to measure product-style lists | unchanged (RNW ~1 s, web hosts ~190-200 ms) |

Two cautions: the 10,000-row step is a single presented frame for stacks whose UI thread blocks, so its value swings from about 2 ms to 1.2 s between identical runs and can spill into the next step; several first-run medians for those steps were understated. The ranking and scores above do not change: Avalonia's runtime score stays 3, and the fixes do not alter the top five.

### Per-factor order

| Factor | Best → weakest |
| --- | --- |
| 1 Adoption | Qt, Electron → Tauri/WebView2, WinUI → Avalonia → RNW, wx, ImGui → Flutter, Slint, Reactor |
| 2 Native look | WinUI MVVM, Reactor → Avalonia → Tauri, Electron, Qt, RNW, wx → Flutter, Slint → ImGui |
| 3 A11y / i18n | Tauri, Electron, WinUI MVVM → Avalonia, Reactor, Qt, wx → Flutter, Slint, RNW → ImGui |
| 4 Delivery | Tauri†, wx, ImGui → Flutter, Slint → Avalonia, Qt → WinUI, Reactor, RNW → Electron |
| 5 Runtime (measured) | wx → Qt, ImGui → Tauri, Electron, Avalonia, WinUI, Reactor, RNW, Flutter, Slint |
| 6 DX | Tauri, Electron → Avalonia → WinUI, Reactor, Flutter, Qt, Slint → RNW, wx, ImGui |
| 7 Risk | Tauri, Electron, Avalonia, WinUI → Qt, Flutter, RNW, wx, ImGui → Slint → Reactor |

### Sensitivity

| Weight profile | Top five |
| --- | --- |
| Default (above) | Tauri 4.25 · Electron 3.80 · WinUI 3.70 · Avalonia 3.60 · Qt 3.55 |
| Native-first (Native 25%, A11y 25%, DX 10%, Delivery 10%, Risk 5%) | **Tauri 4.10 = WinUI 4.10** · Electron 3.75 · Avalonia 3.65 = Qt 3.65 |
| Lean footprint (Delivery 25%, Runtime 20%, DX 15%, Adopt/Native 10%, Risk 5%) | Tauri 4.25 · **wxWidgets 3.80** · Qt 3.55 · Avalonia 3.45 · WinUI 3.40 |

The two other profiles were computed before the factor 5 re-score and were not recomputed; the re-score moves Electron up by at most the profile's runtime weight and Flutter/Slint down by the same amount, none of which crosses into or out of the top five.

Tauri stays first in every profile because it is never weak on any factor except
native look. WinUI catches up when native look/accessibility dominate; wxWidgets
rises only when size and efficiency dominate. The bottom four do not move into
the top five under any of these profiles.

## Pros and cons

**Tauri v2 + Svelte 5** — Pros: least glue for this UI; best text/bidi/IME/
accessibility foundation (Chromium); 4.5 MiB EXE; web design and Svelte reuse;
Rust native layer is small and typed. Cons: not native controls (Fluent polish is
CSS work); depends on WebView2 availability/version unless you bundle >250 MB;
browser hardening is your responsibility; Rust is a second language; 7 processes.

**Electron + Svelte 5** — Pros: identical frontend productivity, single language
(TS everywhere), pinned engine, biggest desktop-web ecosystem, proven by the AI/dev
tools on this PC. Cons: 358 MiB / 73 files; you service Chromium/Node; heaviest
expected RAM; security depends on correct main/preload configuration.

**WinUI 3 + MVVM** — Pros: real Windows controls, ContentDialog, focus, theme and
UIA; Microsoft's direction (Notepad, PowerToys); strong VS tooling; testable MVVM.
Cons: Windows-only; most verbose UI here; P/Invoke for basic window sizing;
231 MiB self-contained with unused AI runtime DLLs; WinAppSDK deployment complexity.

**Avalonia + MVVM** — Pros: closest native re-creation of the reference; MIT;
cross-platform; mature MVVM; used by JetBrains. Cons: drawn controls (not WinUI);
dialogs/overlays and responsive arrangement hand-written; 105 MiB before
trim/AOT; physical AT behaviour still to verify.

**Qt Quick/QML** — Pros: proven in DaVinci Resolve, Avid, DxO, VLC; declarative QML
with typed C++ models; strong list/model framework; single-process GPU renderer.
Cons: LGPL/GPL/commercial obligations; 165-file DLL/plugin deployment with CRT
and `qt.conf`; C++ build pitfalls (linker selection, DLL paths); Basic style is not
Fluent (FluentWinUI3 style is native-looking, not native).

**wxWidgets** — Pros: 6.1 MiB, one EXE, real Win32 controls with native
accessibility and IME; permissive licence; lowest expected runtime cost. Cons:
classic Win32 appearance can't reach Fluent without owner drawing; manual sizer and
text-wrap management; no adoption on this PC; slower-moving ecosystem.

**WinUI 3 + Reactor** — Pros: compact C# MVU over native controls; React-like
mental model without JS. Cons: 0.1.0-preview; analyzer/API constraints; needed
semantic containers and DPI P/Invoke; same 236 MiB deployment as MVVM.

**Flutter** — Pros: excellent widget toolkit and hot reload; 28 MiB AOT output;
good text shaping. Cons: Material, not Fluent; UIA identifiers not exported;
needs VC++ runtime; no Windows adoption evidence here; Dart only for this.

**Slint** — Pros: smallest authored UI; single 25 MiB EXE; compiled declarative UI
with live preview; Rust safety. Cons: stock Fluent accent/caption follow the OS and
can't be fully themed; no Dialog role; clipped controls vanish from AccessKit;
positional (not keyed) repetition; attribution-bearing licence; small ecosystem.

**React Native Windows** — Pros: React/TSX skills, smallest UI source, native
composition rendering, Microsoft-backed. Cons: no local custom fonts in this
release; SVG icons had to become PNGs; heaviest toolchain (Metro/Hermes/MSBuild/
NuGet); 165 MiB / 790 files; four build-pipeline fixes needed.

**Dear ImGui DX12/DX11** — Pros: 1.1 MiB; trivial state model; excellent for
internal tools, inspectors and GPU overlays; MIT. Cons: no UIA provider, no bidi or
complex shaping, monochrome emoji; you own the graphics backend, DPI and layout
coordinates; tool aesthetic. Not acceptable for user-facing or accessible products.

## Recommendation

1. **Default for new desktop apps: Tauri v2 + Svelte 5.** It wins or ties on four of
   seven factors, has no factor below 3, and matches your existing Svelte/web
   skills and the Zodiac website. Keep the reference project's hardening (CSP,
   denied navigation/permissions, embedded assets, no global API) as the template,
   and add typed Tauri commands only when a native operation is designed.
   Use React instead of Svelte only when a required library is React-only.
2. **Close second: Avalonia + MVVM.** Full control over the look like Tauri, but
   native C#: one process, one language, direct .NET library access, no browser
   hardening. Prefer it when the app does not depend on web-only components (such
   as a Notion-style block editor) and you want a native codebase.
3. **Choose WinUI 3 + MVVM when the app must feel like stock Windows** (system
   dialogs, native controls, accessibility parity without CSS effort) and is
   Windows-only. Budget for the deployment work: test trimming/ReadyToRun and
   removing the unused WinAppSDK AI components as separate measured variants.
4. **Choose Qt** for large professional or creative applications with C++ ownership,
   3D/video/hardware needs or embedded targets — after a licensing decision.
   See [Qt versus Avalonia](#qt-quick-versus-avalonia-two-ways-to-draw-your-own-ui).
5. **Electron is Tauri's escape hatch**, not a separate choice: use it only for a
   concrete need Tauri can't meet (built-in `printToPDF`, Node in the main
   process, a pinned Chromium across OSes, VS Code-class extension ecosystems).
6. **wxWidgets** for tiny native utilities; **Dear ImGui** for internal developer tools.
7. **Park** Reactor (preview), RNW (font/toolchain), Slint (theming/licence/
   accessibility gaps) and Flutter (Material-on-Windows, no local adoption) unless a
   specific requirement appears.

For the sensitive **Zodiac receiver** and similar apps, the order changes to
Avalonia, Tauri with a Rust-owned secret path, then WinUI — see
[Security-sensitive apps](#security-sensitive-apps). This document does not settle
the FUT-09 product decision.

## Web UI or native: which direction for most apps

The underlying choice is between a **web UI with a small native layer** (Tauri)
and a **single-process native app in one language** with no browser or IPC
bridge (Avalonia, or WinUI for a stock Windows look). The native app is the
cleaner architecture; the web UI is the better fit for most apps.

**Rule of thumb: if most of the complexity is in the UI, use Tauri. If most of it
is in the system, the data or the security, go native.** Most desktop apps
(productivity, business, CRM-style tools with many screens, forms, lists, rich
text and a custom design) are the first kind, so Tauri is the default and Avalonia
the native choice for the second kind.

Why the web UI suits most apps:

- **Components exist.** Editors, grids, charts, drag-and-drop and command palettes
  are ready-made on the web; in native stacks they are often built by hand.
- **Design and text.** Any Figma design renders as drawn, and Chromium has the
  strongest mixed Hebrew/English text handling.
- **Reach.** The same UI can later become a web app.
- **People and AI tools.** The most developers, examples and AI assistance target
  HTML, CSS and TypeScript.
- **Industry direction.** The newer apps in [installed_apps.md](installed_apps.md)
  went web: Claude, ChatGPT, Cursor, Postman, Stremio and Epic's launcher preview
  (Tauri, per community reports). Microsoft embeds WebView2 panes in Office,
  OneDrive, Visual Studio and PowerToys.

The costs are smaller than they look:

- **The IPC bridge.** A typical app calls native code a few times per user action
  (query the database, save a file, render a PDF). These coarse calls add little.
  The bridge only hurts when large data crosses it continuously; page results and
  keep heavy work on the Rust side.
- **The browser.** Roughly 100 MiB private memory across 7 processes (measured on
  the earlier Tauri fixture) and a hardening job. The reference project's CSP,
  denied navigation/permissions and embedded-asset allowlist are the template.

When a native single-process app is the more correct choice:

1. **Security-sensitive apps** handling passphrases, private keys or decryption — the
   Zodiac receiver is this case. No browser means no browser profile on disk and
   no web attack surface. Tauri remains possible with a Rust-owned secret path; see
   [Security-sensitive apps](#security-sensitive-apps).
2. **The hard part is data, compute or the OS**: real-time feeds, large in-memory
   models, media processing, device or hardware access, where the UI works
   directly against that state and a bridge adds friction.
3. **Low-resource or locked-down machines**: old PCs, VMs/remote desktop, places
   where WebView2 cannot be relied on, or a 6–30 MiB single-EXE requirement.
4. **Standard-looking Windows utilities** where native controls and accessibility
   come for free (WinUI).
5. **Pro/creative tools and embedded devices** (Qt), or a team already invested in
   C#/.NET (Avalonia).

## Security-sensitive apps

Apps that handle passphrases, private keys or decryption — such as the Zodiac
receiver — are judged differently: the question is **which processes, memory and
files can ever see the secret**, and how easily that can be proven in review. This
section is design guidance; no secret-handling GUI has been implemented or
reviewed in this repository, and the FUT-09 product decision in
[desktop-gui.md](desktop-gui.md) remains open.

Only the six stacks that can build real product apps are considered: Tauri,
Electron, Flutter, Avalonia, Qt QML and WinUI 3. wxWidgets has the smallest
dependency graph, but its dated Win32 look and manual layout rule it out for a
product UI; Dear ImGui lacks accessibility entirely.

### Top 3 for security-sensitive apps

1. **Avalonia + MVVM — simplest to prove.** One process, no browser anywhere, MIT,
   portable self-contained folder with no runtime install. The claim "no browser
   can see the secret" is true by construction. Caveats: the passphrase field is a
   `TextBox` with a password character, whose IME, clipboard and screen-reader
   behavior must be checked physically, and `TextBox.Text` is an immutable .NET
   string that cannot be wiped.
2. **Tauri v2 + Svelte 5, with Rust owning the secret — the one-stack option.**
   Acceptable only with the secret-isolation design below. Its secret-memory
   hygiene can be the best of the three, because Rust can zero buffers it owns;
   the cost is a larger trusted base to review.
3. **WinUI 3 + MVVM — the most correct default password field.** Windows' own
   `PasswordBox` (reveal button, native password semantics for screen readers).
   Windows-only; 231 MiB; `PasswordBox.Password` is also an immutable string;
   portable launch without installing the Windows App SDK still needs a
   clean-machine check.

The other three: **Qt QML** is a credible fourth (one process, no browser, C++
control over owned buffers) but brings the LGPL review and DLL/plugin deployment.
**Flutter** has no browser either, but immutable Dart strings, the UIA identifier
gaps seen here and no Windows adoption evidence. **Electron** is the weakest: the
same browser exposure as Tauri plus Node in the main process, and no built-in
native password prompt — the Tauri pattern below would need a native addon.

### Tauri secret-isolation design

The web UI is treated as **untrusted presentation**; Rust owns the whole secret
path.

1. The web UI requests "unlock" through **one narrow Tauri command that accepts
   no secret and no output path** from JavaScript.
2. Rust shows a **native password prompt**: Windows' credential dialog
   (`CredUIPromptForWindowsCredentialsW`) or a small Win32 dialog with a password
   edit control.
3. Rust selects the ciphertext, key file and plaintext output through **native file
   dialogs**, so a compromised page cannot steer where plaintext is written.
4. Rust hands the passphrase bytes to the Go CLI over the reviewed channel in
   [desktop-gui.md](desktop-gui.md) §8–9 — never argv, environment, piped stdin
   or temp files — and **zeroes its buffer immediately**.
5. The WebView only receives status (`unlocked`, `failed`, `done`), never the
   passphrase, key material or plaintext.

| Concern with a browser UI | Mitigation | Residual |
| --- | --- | --- |
| Renderer processes and JS strings hold the secret | Native prompt in Rust; the secret never reaches JavaScript | Prove by review and tests that no command accepts or returns it |
| Autofill and password managers | Secret not typed in the web UI; reference app already disables general autofill and extensions; also disable WebView2 password autosave explicitly and test | Little |
| WebView2 profile on disk | Reference app already uses private (incognito) mode with an isolated profile folder | Runtime still writes some files (crash reports, cache metadata) — acceptable for non-secret UI, but "nothing on disk" is only partially true |
| Security depends on browser lockdown | Keep the reference CSP, denied navigation/permissions/downloads, embedded assets, no release DevTools, minimal commands | Still required as defense in depth, but no longer the secret's only guard |

What Tauri still cannot match: a larger trusted base (WebView2 runtime + Rust host +
command bridge + Go versus one native process + Go); "a browser is present but
never sees the secret" is a harder claim to verify than "there is no browser";
Evergreen WebView2 changes underneath a signed release unless a >250 MB Fixed
Version is bundled; and the native prompt is a visual seam in the web design.

### Rules for every stack

These follow the repository's [AGENTS.md](../AGENTS.md) and are independent of the
UI toolkit:

- **Go owns all cryptography and key policy.** The UI collects input and shows status.
- **Secret hand-off** to Go uses the reviewed channel — never argv, environment,
  piped stdin or temp files.
- **Clear owned buffers on all paths, and state the limits honestly**: .NET, Dart
  and Go strings, toolkit/OS control internals and runtime copies cannot be
  guaranteed wiped.
- **No clipboard, logs, history, crash-report or telemetry contents** containing
  secrets or plaintext; plaintext goes only to an explicitly chosen output file.
- **Physical Narrator/NVDA and IME checks** of the password field; UIA reports are
  not acceptance.
- **Signed releases** with per-file and final hashes published through a trusted
  channel; no automatic updater.

## Tauri + Svelte versus Avalonia in depth

Both give **full control over the look**; neither uses Windows' own controls for
its visuals. They differ in *how* they draw, *where* the code runs and *what
ecosystem* you build with. Evidence from this repository is marked; ecosystem
names are examples that exist upstream, not tested dependencies.

| Dimension | Tauri v2 + Svelte 5 | Avalonia 12 + MVVM |
| --- | --- | --- |
| Rendering | WebView2: Blink layout → Skia → Chromium compositor → ANGLE/D3D11, in a **shared multi-process browser** (7 processes measured earlier) | Avalonia compositor (separate render thread) → **SkiaSharp** → ANGLE/D3D11, **in your own process** (detected `libSkiaSharp`, `av_libglesv2`) |
| Styling model | CSS cascade, Tailwind tokens, pseudo-classes, `@media`/container queries; any CSS from Figma Dev Mode applies directly | CSS-like **selectors and styles**, `ControlTheme`s and fully replaceable control templates (controls are lookless); tokens become XAML resources by hand |
| Responsive layout | One `@media` block in this project | Imperative `ArrangeCards()` here; newer Avalonia container queries could replace it (not used/tested here) |
| Visual effects | Gradients, shadows, `backdrop-filter`, masks, blend modes, SVG, Canvas/WebGL/WebGPU | Gradients, `BoxShadow`, blur/drop-shadow effects, opacity masks, `ExperimentalAcrylicBorder`, direct Skia drawing for custom visuals; Mica/Acrylic window backdrops |
| Animation | CSS transitions/keyframes, Svelte transitions, Motion | Transitions and keyframe animations in styles, composition animations on the render thread |
| Text and RTL | Chromium: HarfBuzz, full bidi, color emoji, IME; `dir`/logical CSS | HarfBuzz + Skia, `FlowDirection` RTL mirroring; very good, verified here only visually and by UIA |
| Rich content | Mature editors (ProseMirror/TipTap, Lexical, BlockNote), grids, charts, DnD | Text boxes, selectable inline text, code editor (AvaloniaEdit); **no Notion-style block editor** — you would build one |
| Data grids, charts | TanStack Table/Virtual, AG Grid, ECharts | Built-in DataGrid/TreeDataGrid, LiveCharts2/ScottPlot, commercial suites |
| Native access | Rust commands over **IPC**: serialization, async boundary, capability permissions | **Direct in-process calls** to any .NET library (EF Core/SQLite, PDF libraries, Windows APIs): one language, no bridge |
| State | Svelte runes / stores; keyed DOM lists | MVVM Toolkit source generators, compiled bindings, commands; strongly typed view models |
| Security surface | Browser hardening is your job: CSP, navigation/permission denial, asset allowlist, IPC capabilities (~13 KB Rust here) | No browser/XSS class of issues; ordinary .NET/native app security |
| Footprint (measured) | **4.5 MiB EXE** + shared WebView2 runtime | **105 MiB / 222 files** self-contained JIT, untrimmed; trimming / Native AOT can shrink it (untested here) |
| Runtime (expected) | Earlier Tauri fixture: ~98 MiB private resident across 7 processes, ~0.5 s retained start | One process; .NET JIT start-up cost unless ReadyToRun/AOT; **unmeasured** |
| Dev loop | Vite HMR, browser DevTools, Playwright/Vitest | XAML previewer, Avalonia DevTools, .NET Hot Reload, headless UI tests (upstream; not timed here) |
| Accessibility | Chromium accessibility tree from semantic HTML/ARIA | Automation peers → UIA; needed explicit `AutomationProperties` here |
| Beyond Windows | Same UI as a website; macOS/Linux use WebKit (rendering differences to test) | Same Skia pixels on macOS/Linux; WASM and mobile targets exist |
| Licence | MIT/Apache-2.0 | MIT core; some newer first-party add-ons/tools are commercial — check per feature |
| This repository | Reference app; 38.6 KB authored | 32.5 KB authored; dialog overlay, responsive code and icon geometry hand-written |

**Choose Tauri + Svelte** when the product leans on web components (block editors,
complex grids, charts, DnD), when you might ship a web version, when the smallest
download matters, or when your team thinks in HTML/CSS.

**Choose Avalonia** when you want one native C# codebase with no browser, IPC or
CSP to manage, direct .NET access to databases/PDF/Windows APIs, pixel-identical
cross-platform rendering, and the app is mostly forms, lists, grids and
dashboards rather than web-style rich content.

For the freelancer workspace below, Tauri wins because of the block editor and
web ecosystem; Avalonia would require building that editor yourself.

## Qt Quick versus Avalonia: two ways to draw your own UI

A common misconception is "Qt is native, Avalonia is Skia". **Neither Qt Quick nor
Avalonia uses Windows' own controls.** Both draw their own controls on the GPU;
they differ in renderer design and ecosystem.

| Where "native" applies | What draws the controls |
| --- | --- |
| wxWidgets, WinUI 3 | Windows itself (Win32 common controls; WinUI XAML/Composition) |
| Qt **Widgets** (not used here) | Qt's `QStyle` painting with a Windows-like style — native-looking, not OS controls |
| Qt **Quick/QML** (used here) | Qt's own scene graph on RHI (D3D11 here) |
| Avalonia | Avalonia's own compositor on Skia (ANGLE/D3D11) |

| Dimension | Qt 6 Quick/QML | Avalonia 12 |
| --- | --- | --- |
| Renderer | **Retained scene graph** of batched GPU geometry; threaded render loop; RHI picks **D3D11, D3D12, Vulkan or OpenGL** (explicit D3D11 and verified hardware here) | Composition tree on a render thread, drawn by **Skia** (immediate 2D API) through ANGLE → D3D11 |
| Visual power | GPU shaders (`ShaderEffect`, `MultiEffect`), particles, **Qt Quick 3D** for 3D UI, distance-field text that scales cheaply | Rich 2D: Skia paths, gradients, effects, custom Skia drawing; no built-in 3D UI |
| Controls/styles | Quick Controls styles: Basic, Fusion, Material, Universal, **FluentWinUI3** (Fluent-looking, not native) | Fluent and Simple themes; lookless templated controls; community themes |
| Languages | C++20 + QML (JavaScript expressions) | C# + XAML |
| Data/model | `QAbstractListModel`, proxies, persistent indexes (used here for keyed reverse) | `ObservableCollection`, view models, compiled bindings |
| Text and i18n | HarfBuzz shaping, RTL `LayoutMirroring`, Qt Linguist translation workflow | HarfBuzz shaping, `FlowDirection`, .NET resource localization |
| Batteries included | Multimedia, WebEngine (Chromium), PDF, Graphs/Charts, networking, serial/Bluetooth, positioning, Qt Quick 3D | Relies on NuGet/.NET for those (media, web views, PDF via third parties) |
| Designer workflow | Qt Creator, **Qt Design Studio** with a Figma-to-QML bridge | VS/Rider plugins, previewer, DevTools; Figma → XAML by hand or community tools |
| Targets | Desktop, mobile, **embedded/automotive** (strongest), WebAssembly | Desktop, mobile, embedded Linux, WebAssembly |
| Deployment (measured) | **69.2 MiB / 165 files**: Qt DLLs, QML modules, plugins, app-local CRT, `qt.conf` | **105.1 MiB / 222 files** self-contained .NET; single-file/trim/AOT routes possible |
| Licence | LGPLv3/GPL or commercial; several add-on modules are GPL-or-commercial only; static linking has LGPL obligations — **legal review needed** | MIT core |
| Adoption on this PC | DaVinci Resolve, Avid, DxO, VLC, qBittorrent, OnionShare, Photoshop parts | ReSharper (30 Avalonia assemblies), VS Git credential helper |
| This repository | 41.1 KB authored incl. startup/adapter diagnostics; linker and DLL-path pitfalls fixed | 32.5 KB authored; imperative layout and overlay code |

**Choose Qt** for C++ teams, performance-critical media/creative tools, 3D or
shader-heavy UI, hardware integration and embedded devices — and accept the
licensing and deployment work.

**Choose Avalonia** for C# teams building business and productivity apps
(forms, grids, dashboards, workflows), where MIT licensing, faster development
and the .NET ecosystem matter more than shaders, 3D or embedded reach.

## Scenario: a Figma-designed all-in-one freelancer workspace

The question: one Windows 11 desktop app that combines **Linear-style issue
tracking**, a **Notion-style CRM and knowledge base**, and **Morning/Green
Invoice-style invoicing/ERP**, replacing monday CRM + Priority Cloud + Jira for
freelancers, built from a modern, elegant, "wow" Figma design. This is a different
product from the benchmark screen, so it is judged on **capabilities the product
needs**, not on the parity work above.

### What the product demands from the stack

| Need | Why it is hard |
| --- | --- |
| Pixel-faithful custom design | Unique visuals (gradients, glass/blur, soft shadows, custom shapes, micro-interactions) — stock control themes won't match a bespoke Figma file |
| Block-based rich-text editor | Notion-style pages: slash menu, drag handles, embeds, tables, mentions, collaborative-ready data model. The hardest single component |
| Issue tracker UI | Kanban drag-and-drop, keyboard-first command palette, fast filtering, virtualized lists of thousands of issues |
| ERP / invoicing | Data grids, validated forms, multi-currency (ILS), charts, **invoice PDF generation and printing** |
| Hebrew + English | Mixed RTL/LTR text, mirrored layouts, numbers/dates inside Hebrew sentences, Hebrew invoices |
| Local-first data | SQLite or similar, offline use, later sync/collaboration |
| Windows 11 polish | Mica/Acrylic, notifications, tray, global shortcuts, deep links, auto-update, multiple windows |
| Future reach | Optional web version or macOS without a rewrite |

### Capability fit (1–5)

Only the six stacks that could plausibly build this are scored; the rest are
excluded below. Ecosystem names are examples of what exists, **not dependencies
tested in this repository**.

| Capability | Tauri + web UI | Electron + web UI | Flutter | Avalonia | Qt QML | WinUI 3 |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| Figma fidelity / custom visuals and motion | 5 | 5 | 5 | 4 | 4 | 3 |
| Block editor (Notion-like) | 5 | 5 | 3 | 2 | 2 | 1 |
| Issue tracker UI (DnD, palette, virtual lists) | 5 | 5 | 4 | 3 | 3 | 3 |
| ERP grids, forms, charts | 5 | 5 | 4 | 4 | 3 | 3 |
| Invoice PDF / print with Hebrew | 4 | 5 | 3 | 3 | 4 | 3 |
| Hebrew RTL / bidi | 5 | 5 | 4 | 4 | 4 | 4 |
| Local-first data & sync | 5 | 4 | 4 | 4 | 4 | 4 |
| Windows 11 polish (Mica, tray, notifications, updater) | 4 | 4 | 3 | 4 | 3 | 5 |
| Footprint & efficiency | 4 | 2 | 4 | 3 | 3 | 2 |
| Web/macOS reuse | 4 | 5 | 4 | 3 | 3 | 1 |
| **Total / 50** | **46** | **45** | **38** | **34** | **33** | **29** |

Why the scores land there:

- **Design fidelity.** Chromium renders anything Figma can draw: Figma Dev Mode
  emits CSS; Figma variables map to design tokens and a Tailwind theme; motion via
  CSS/Svelte transitions or Motion. Flutter equals this on the native side because
  every pixel is custom-painted anyway. Avalonia and Qt can do it with more
  hand-translation (tokens → XAML resources/QML). WinUI pulls you back toward the
  Fluent look; matching a bespoke design means re-templating many controls.
- **The editor decides it.** Mature block editors are web components:
  ProseMirror/TipTap, Lexical, BlockNote and Plate. Several of the most complete
  Notion-like ones (BlockNote, Plate) are **React-first**; TipTap/ProseMirror work
  with Svelte. Flutter has credible options (AppFlowy — a Notion alternative built
  with Flutter and Rust — publishes its editor; `super_editor` exists). Avalonia,
  Qt and WinUI offer rich-text boxes or code editors, not block editors: you would
  build one.
- **Issue tracking and ERP.** The web has framework-agnostic or multi-adapter
  pieces for every part: TanStack Table/Virtual, AG Grid, Atlassian's
  pragmatic-drag-and-drop (built for Jira/Trello), command palettes, ECharts. Native
  stacks have grids (Avalonia DataGrid/TreeDataGrid, Qt models, WinUI community
  grids) and often commercial suites, but fewer ready product-grade pieces.
- **Hebrew invoices.** HTML → PDF through Chromium is the most reliable way to get
  correct bidi in a mixed Hebrew/English invoice. Electron has `printToPDF`
  built in. With Tauri you would reach WebView2's PDF printing through the
  platform webview handle or generate PDFs in Rust (e.g. Typst) — doable, not
  built in, untested here. Legal e-invoicing requirements (such as Israel Tax
  Authority allocation numbers) are an online API concern, independent of the stack.
- **Real-world precedent (public knowledge, not re-verified here).** Linear,
  Notion, Figma's desktop app, AFFiNE, Anytype and Obsidian ship desktop apps on
  Electron. AppFlowy uses Flutter. The installed_apps.md survey adds Cursor,
  Postman, Claude and ChatGPT on Electron. Products in this exact category have
  overwhelmingly chosen a web renderer.

### Recommendation for this product

1. **Tauri v2 + web UI on WebView2.** On Windows 11 WebView2 *is* Chromium, so
   the Figma design renders exactly as in a browser, while the app ships as a
   few-MB EXE instead of ~360 MiB. Rust (or a Go sidecar, matching your Go
   experience) owns SQLite, sync, file export and PDF. Built-in window effects,
   tray, notifications, deep links, global shortcuts and updater plugins cover the
   Windows 11 polish. Choose the frontend by the editor: **Svelte 5** if TipTap/
   ProseMirror satisfies you (fits your skills); **React** if you adopt BlockNote or
   Plate and React-first grid/DnD kits — exactly the "React-only component"
   exception in the [WebView2 framework comparison](webview2-raw-bench/8-framework-test/CODE-COMPARISON.md).
2. **Electron + the same web UI** if you need built-in `printToPDF`, Node native
   modules in-process, or an identical Chromium on macOS/Linux later (Tauri uses
   WebKit there). The web code stays the same, so this is a reversible choice if
   the UI layer avoids host-specific APIs.
3. **Flutter** is the only native contender: equal design freedom, a proven
   Notion-like precedent (AppFlowy), good RTL. You give up the web editor/grid
   ecosystem, Fluent conventions and the UIA identifiers seen in our validation;
   choose it only if you prefer Dart and full custom painting.
4. Avalonia and Qt are capable of elegant custom UI, but you would build the block
   editor and much of the tracker yourself. WinUI fights a non-Fluent design.

Excluded for this product: **wxWidgets** (cannot express the design), **Dear ImGui**
(no accessibility or RTL shaping), **Slint** (thin ecosystem, stock-widget theming
limits, no editor), **React Native Windows** (no custom fonts in this release —
fatal for a typography-driven design), **Reactor** (preview).

Practical cautions carried over from this cohort:

- **Virtualize every long list and table.** The benchmark's unvirtualized 10k
  rows are a stress test, not a product pattern. Heavy `backdrop-filter`/blur on
  large animated areas also costs GPU time; profile on modest hardware.
- **Plan RTL in the Figma file itself**: mirrored layouts, CSS logical properties
  (`margin-inline-start`), `dir="auto"` for user content, `Intl` formatting for ILS.
- **CSP**: the reference's `style-src-attr 'none'` would reject many editor and
  grid libraries that set inline styles. A product app needs a deliberate,
  reviewed CSP per library rather than the benchmark's maximal one.
- **Data architecture outweighs framework choice** for an all-in-one tool:
  decide the local database, sync/conflict model (CRDT such as Yjs/Automerge or
  server-authoritative) and permissions before UI work starts.

## What would change this ranking

- The calibrated cross-toolkit pilot (startup, whole-tree private memory, idle CPU,
  input-to-presentation, 10k list operations) could move factor 5 — especially
  for Electron versus Tauri (shared versus private engine pages) and .NET JIT
  versus Native AOT.
- Physical Narrator/NVDA, IME and high-contrast trials could lower any stack's
  factor 3, including the browser ones.
- Trimmed/AOT WinUI/Avalonia variants could raise their delivery scores substantially.
- A clean Windows VM run could expose missing runtime prerequisites (Qt CRT,
  Flutter VC++ runtime, WebView2 availability).

Keep these separate from the source/artifact findings above; rebuild and re-freeze
artifacts before measuring, as the comparison plan requires.
