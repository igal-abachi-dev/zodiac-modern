# NeutronStar React Native Windows candidate

Independent React/TypeScript implementation of the full
[Tauri/Svelte feature inventory](../Tauri-v2-Svelte5/FEATURE-PARITY.md).
React Native Windows **0.85.0**, React Native **0.85.3**, React **19.2.3**,
Fabric/Windows Composition and Hermes. This is an **unpackaged Win32 desktop app**,
not UWP, a Store package, HTML or WebView2. It uses standard free React Native
Text/Input/Pressable/ScrollView/Modal primitives.

## Build and run

Windows 11 x64; Node **24.21.0**, .NET **10** for the local PowerShell build tool,
Visual Studio 2026 C++ v145 tools and Windows SDK **10.0.26100.0**.
The scripts also find this repository's pinned Node installation if available.
No Rust toolchain or browser runtime is required by this UI.

1. Run **Init.cmd** once: locked npm restore with scripts disabled, pinned local
   PowerShell tool restore and native NuGet restore/Release build.
2. After changes, run **Build.ps1**. It type-checks, runs model tests, generates
   the production Metro bundle, compiles optimized Hermes bytecode and builds
   the native shell with MSBuild. It never starts a Metro server.
3. Right-click **Run.ps1 → Run with PowerShell**, or run it in PowerShell.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Run.ps1
```

The runnable artifact is **out/win-x64/NeutronStar.exe** with its entire adjacent
folder, including `Bundle/`, app-local Microsoft/Windows App SDK/Hermes DLLs,
resources and notices. Do not copy only the small EXE. Debug symbols/source maps
are build outputs, not needed to run; exclude them consistently in later size reports.
`windows/NeutronStar.sln` opens in Visual Studio. Release is the supported comparison
path; the unused Store packaging project from the official template was removed.

Native dependencies use the official RNW template/props and pinned NuGet lock.
Build with `-Restore` only when restoration is needed; normal builds use the
existing locked assets. npm versions/integrities live in `package-lock.json`.
The local `.config/dotnet-tools.json` pins PowerShell 7.6.1; it does not change
the machine's installed shell or execution policy. CLI codegen telemetry is disabled.

## State, controls and assets

`src/domain.ts` owns pure workflow/row transitions; components own local React state.
No Nano Stores, Zustand, renderer reuse or sibling dist is imported. Timers use a
monotonic clock, synchronous cancellation and generation checks; unmount/remount
invalidates queued updates. Stable row keys and memoized native text rows avoid
updating unchanged text. ScrollView mounts **all** 1,000/10,000 rows, with clipping
removal disabled; there is no FlatList/VirtualizedList lane in this candidate.

Main progress, completion/cancel/reset, About dialog, focus restoration, filtering,
replace/reverse/splice/update, two-second rate requests and remount are present.
Stop is idempotent and exposes public accessibility hints for active/stopped state.
The two-frame Ready scheduling is semantic readiness, not a physical-paint timestamp.

**Font parity limitation:** this RNW release calls DirectWrite CreateTextFormat
with the system font collection. Its local custom-TTF feature remains incomplete.
This candidate explicitly uses **Windows Segoe UI**, not an unverified Inter fallback.
Local Lucide PNGs are 96px rasterizations of the reference SVGs, displayed at 24 DIP;
they were generated with the pinned wxWidgets build-time utility, not fetched at runtime.
These font/icon/control-rendering differences must be disclosed or normalized in a
separate lane before claiming a tightly matched visual/performance comparison.

The native shell follows Microsoft's cpp-app template with app-local dependency
deployment, fixed client size, bundled-only Release settings and native CFG/ASLR/
DEP/CET link flags. Windows APIs/WinRT ABI usage here does not make it a UWP app.
No Go CLI, crypto, application network calls, persistent user history or updater.
Framework availability of such APIs is not a claim of a sandbox/security audit.

## Verification

From `desktop/`, with the foreground desktop undisturbed:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File host-test-support/candidate-checks/Run.ps1 -Candidate ReactNative
```

See [VALIDATION.md](VALIDATION.md) for actual outcomes, failures and remaining gates.
No comparative benchmark has been run. Runtime licences/notices include React,
React Native, RNW, Hermes, Windows App SDK, Microsoft CRT and Lucide; generated
inventory is a starting point, not final distribution compliance approval.

Official references: [RNW getting started](https://microsoft.github.io/react-native-windows/docs/getting-started/),
[template source](https://github.com/microsoft/react-native-windows/tree/44614fd3529cdaeeadeaa97ab3d389587c6bd95a/vnext/templates/cpp-app),
[font implementation](https://github.com/microsoft/react-native-windows/blob/44614fd3529cdaeeadeaa97ab3d389587c6bd95a/vnext/Microsoft.ReactNative/Fabric/platform/react/renderer/textlayoutmanager/WindowsTextLayoutManager.cpp).
