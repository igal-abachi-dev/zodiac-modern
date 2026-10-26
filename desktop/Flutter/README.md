# NeutronStar — Flutter / Dart

Independent Windows desktop implementation of the complete
[Tauri/Svelte UI contract](../Tauri-v2-Svelte5/FEATURE-PARITY.md), including the
list/filter workbench. UI and state are **Dart**, compiled AOT for Release.
Flutter supplies its rendering engine; the small standard C++ Win32 runner
creates the decorated window. There is no WebView, HTML, Svelte, Go or native
command bridge in this candidate.

Install official **Flutter stable 3.47.8 / Dart 3.13.7** and set `FLUTTER_ROOT`,
or place it in `desktop/.cache/flutter-toolchain/flutter`. Also install Visual
Studio's Desktop development with C++ workload, CMake and Windows SDK. Android
and Chrome are not required for this Windows-only project. `Toolchain.ps1` checks
the exact Flutter framework revision before building. Dependencies are locked.

Run `Build.ps1` (or `Init.cmd`), then right-click `Run.ps1` → **Run with PowerShell**.
Build runs locked dependency restore, formatting, analysis, tests and the Windows
Release build. Distribute the **entire** `build/windows/x64/runner/Release` folder,
including `flutter_windows.dll`, `data` and assets; the small EXE alone is not the
application. A target machine also needs the supported Microsoft Visual C++
runtime. This research output is unsigned and has no installer or updater.

Standard free Material 3 controls are styled with the reference neutral/emerald
tokens. Trusted local Lucide SVGs use pinned `flutter_svg`; Inter and Noto Sans
Hebrew are bundled. There is no runtime font download or remote SVG loading.
Material interaction/text rendering differs from Fluent and Ark; document those
differences rather than calling this a pixel-identical toolkit implementation.

`lib/domain.dart` owns workflow and workload controllers, keyed immutable rows,
elapsed-time simulation and timer cancellation. The workbench is separately
mounted/disposed. **All 1k/10k rows are built**, with no `ListView.builder` or
virtualization. Requested update rates are not achieved FPS. `Semantics` provides
stable automation identifiers and a live status; physical AT testing is separate.

The runner requests a 960 × 640 DIP **client** and light title bar. It retains the
standard Flutter first-frame window-show callback. Therefore window-visible →
Ready cannot be compared alone with hosts that show a window before their UI
loads: later benchmarks must also record process creation → visible/content/Ready.
Local fonts load before `runApp`; Ready follows the first mounted UI frame.

SDK provenance: official archive
`stable/windows/flutter_windows_3.47.8-stable.zip`, framework
`737ba8f885dc774b53b442759999a312c9461e4e`, archive SHA-256
`11e19ea3409808fe3b3765ea8149640c299e58cce6eda7c9f38fc1b4a193eb6e`.
The workspace SDK was verified before extraction and analytics disabled.

If `flutter build windows` rejects Visual Studio while its installer reports
`isComplete=false` / `isLaunchable=false`, finish or repair that installation.
Do not patch Flutter's discovery logic. During this session, the already-generated
standard CMake project built successfully using VS 2026's own CMake/MSBuild;
that was a disclosed local build path, not evidence the installation check passed.
After the installation completed, the normal `Build.ps1` path also passed.

See `VALIDATION.md` for actual acceptance and remaining gates. No cross-toolkit
performance benchmark has been run for Flutter.

References: [official archive](https://docs.flutter.dev/install/archive),
[Windows builds](https://docs.flutter.dev/platform-integration/windows/building),
[Flutter accessibility](https://docs.flutter.dev/ui/accessibility).
