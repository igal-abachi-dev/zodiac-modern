# NeutronStar native WinUI 3 + MVVM Toolkit

**Built native desktop comparison candidate.** Resumed 2026-10-25 after the
previous session pause. See [validation](VALIDATION.md) for exact acceptance
evidence and remaining gates; the old [handoff](HANDOFF.md) is historical.

Independent C#/XAML implementation targeting Windows App SDK **2.5.1**,
CommunityToolkit.Mvvm **8.4.2**, .NET SDK **10.0.402**, Windows 11 x64.
Uses standard free WinUI Fluent buttons, text box, progress bar and ContentDialog.
No browser UI, Go invocation, real cryptography or user-file processing.

This is a **Win32 desktop app**, with `WindowsPackageType=None`: no UWP, Store
or MSIX requirement. WinUI 3 uses WinRT APIs and C#/WinRT interop internally;
those terms do not make it a UWP application. Toolkit observable properties use
the supported partial-property pattern for that interop layer; warnings remain
errors and no diagnostic suppression was added.

Sources cover the main synthetic Encrypt/Decrypt/Cancel/Reset workflow and the
complete list/filter workbench contract. View models, dispatcher timer adapter,
XAML, local fonts/icons and model checks belong to this project. No sibling UI
or state source is imported. Font/icon specifications follow the reference.

The independent model assertions and self-contained Release build pass. The
complete workflow and workbench are checked through the external Windows UIA
checker, not application-side test hooks. No performance benchmark is claimed.

The application is already built. Right-click **Run.ps1 → Run with PowerShell**,
or use:

```powershell
.\Build.ps1
.\Run.ps1
```

Output: `out/win-x64/NeutronStar-WinUI-Mvvm.exe`. Keep the entire published
folder together; the small apphost EXE is not the application footprint. Close
the app before rebuilding. No installer, trimming, Native AOT or ReadyToRun is
selected. Both .NET and Windows App SDK are published self-contained; verify any
remaining native prerequisites on a clean Windows machine before distribution.
Open `NeutronStar.WinUINative.slnx` in a compatible Visual Studio for the app and
independent model checks. Normal builds need .NET SDK 10.0.402 and the WinUI/Windows
build tooling, not Node or Rust.

## Structure and design

- `Models/Models.cs`: own Toolkit observable models, relay commands, pure row
  operations and generation-aware timer cancellation/disposal.
- `DispatcherClock.cs`: native UI-thread timer adapter with a monotonic clock;
  the independent model checks inject a deterministic fake clock.
- `MainWindow.xaml`: compiled `x:Bind`, native Fluent controls and an explicitly
  unvirtualized `ItemsControl`/`StackPanel` stress list. A small layout-only
  `WrapPanel` wraps ordinary Fluent toolbar buttons at narrow widths.
- `MainWindow.xaml.cs`: window sizing, responsive view layout, native dialog and
  focus/scroll lifecycle. No domain/file/process operations are implemented here.
- Standard `ContentDialog` handles modality, Escape and keyboard navigation.
  Native control-template behavior differs from Ark; it is not reimplemented
  as a browser overlay. Primary hover/pressed colors retain readable contrast.
- Local Inter/Noto Hebrew and static Lucide paths follow the shared design
  specification. Font provenance/licenses are retained. Glyph layouts, text
  metrics and native interaction are not claimed pixel-identical to a webview.

The Windows App SDK graph includes WebView2 support assemblies transitively.
Their presence does **not** mean this app renders HTML: no WebView2 control or
browser environment is created. This is the native WinUI candidate, separate
from `WinUI3-webview2` and the planned `WinUI3-cs-native-reactor` candidate.

`Build.ps1` uses locked restores, model assertions, a clean generated publish
folder, generated XBF/PRI checks, dependency notices and full published-file
hashes in `.cache/build-receipt.json`. Never measure a stale mixed publish folder
or compare only the EXE against a full Electron distribution.

Run external checks with
`../host-test-support/candidate-checks/Run.ps1 -Candidate WinUI`.
These are correctness checks, not unbiased performance measurements. Physical
AT/IME/contrast/other DPI, clean-machine deployment and the eventual Go/crypto
boundary remain separate gates. See [the comparison plan](../DESKTOP-COMPARISON-PLAN.md).
