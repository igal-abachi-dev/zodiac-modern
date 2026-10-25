# NeutronStar Avalonia

Independent **Avalonia 12.1.4 + CommunityToolkit.Mvvm 8.4.2** implementation of
the complete [Tauri reference contract](../Tauri-v2-Svelte5/FEATURE-PARITY.md).
AXAML with compiled bindings renders free built-in Fluent controls through
Avalonia/Skia. It contains no WebView2, HTML renderer, paid controls or imported
Svelte/application code.

Implemented: synthetic Encrypt/Decrypt progress, Cancel/Reset, About dialog,
keyboard focus restoration and the complete list/filter workbench, including
1,000/10,000 rows, reverse/splice/update, requested 10/30/60 Hz bursts, Stop,
remount and fresh reopen. No files or cryptography are processed and no Go CLI
is invoked.

## Build and run

Build requirements: Windows 11 x64, **.NET SDK 10.0.402** (pinned by `global.json`).
No Node, Rust, WebView2 or font-conversion tool is required for normal builds.
The current self-contained Release build already exists.

```powershell
.\Build.ps1
.\Run.ps1
```

Right-click **Run.ps1 → Run with PowerShell** to launch it. The application is
`out/win-x64/NeutronStar-Avalonia.exe`; keep the entire published folder together.
An installed .NET runtime is not required for that folder. Close the app before
rebuilding. Open `NeutronStar.Avalonia.slnx` in a compatible Visual Studio to edit
and debug the app/tests normally.

`Build.ps1` restores the locked graph, runs the independent model checks, cleans
only its fixed generated publish directory, publishes and generates notices and
a file/hash receipt. The primary build is self-contained **JIT**, with neither
Native AOT, trimming nor ReadyToRun enabled. Those would be separately labeled
deployment/optimization variants rather than silent benchmark changes.

## Implementation

- `MainViewModel` / `WorkbenchViewModel`: MVVM Toolkit observable properties and
  relay commands; monotonic elapsed progress; generation-aware timer disposal.
- `MainWindow.axaml`: layout/compiled bindings and non-paid controls.
  Code-behind handles view concerns: dialog focus, Escape, scroll and responsive
  card/header/footer arrangement. It does not perform domain operations.
- A plain `ItemsControl` with an explicit `StackPanel` deliberately realizes
  every stress-test row. No default list virtualization hides the cost of the
  10,000-row workload. Immutable row/list updates are this implementation's
  strategy, not an assertion that they are optimal for every Avalonia app.
- Local Inter 400/500/600 and Noto Sans Hebrew use the same Fontsource 5.3.0
  glyphs as the web design, decompressed to TTF for native loading. The conversion
  script and per-file provenance/hashes are committed; it is a development-time
  step, not an app/build dependency. Licenses are retained.
- Lucide paths are trusted static geometries, drawn with native shapes; there
  is no runtime SVG/XML import. Window chrome is standard and the default is light.

The Windows backend is Avalonia's standard selection. Skia does not imply that
every machine uses the same GPU API; record the actual graphics path/fallback
when measuring. AXAML controls, text layout, focus and accessibility are distinct
from browser DOM controls, so pixel-perfect or accessibility parity is not assumed.

See [validation](VALIDATION.md) and [the desktop comparison plan](../DESKTOP-COMPARISON-PLAN.md).
These are UI simulations; product signing, clean-machine deployment, physical
AT/IME/high-contrast/DPI checks and any later cryptographic boundary remain separate.

References: [Avalonia releases](https://github.com/AvaloniaUI/Avalonia/releases),
[MVVM Toolkit](https://learn.microsoft.com/en-us/dotnet/communitytoolkit/mvvm/),
[pinned Toolkit package](https://www.nuget.org/packages/CommunityToolkit.Mvvm/8.4.2).
