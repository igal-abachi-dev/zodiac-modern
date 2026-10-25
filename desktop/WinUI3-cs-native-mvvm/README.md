# NeutronStar native WinUI 3 + MVVM Toolkit

**In progress — not yet runnable or benchmark-ready.** Paused at the user's
request on 2026-10-24 to conserve session usage. See [the handoff](HANDOFF.md).

Independent C#/XAML implementation targeting Windows App SDK **2.5.1**,
CommunityToolkit.Mvvm **8.4.2**, .NET SDK **10.0.402**, Windows 11 x64.
Uses standard free WinUI Fluent buttons, text box, progress bar and ContentDialog.
No browser UI, Go invocation, real cryptography or user-file processing.

This is a **Win32 desktop app**, with `WindowsPackageType=None`: no UWP, Store
or MSIX requirement. WinUI 3 uses WinRT APIs and C#/WinRT interop internally;
those terms do not make it a UWP application. The current compiler diagnostic
concerns that interop layer, not a change to the chosen app/deployment model.

Sources cover the main synthetic Encrypt/Decrypt/Cancel/Reset workflow and the
complete list/filter workbench contract. View models, dispatcher timer adapter,
XAML, local fonts/icons and model checks belong to this project. No sibling UI
or state source is imported. Font/icon specifications follow the reference.

The independent model assertions pass. The application publish currently fails
the Toolkit's WinRT compatibility diagnostic; actual-window validation has not
started. `Run.ps1` is for the eventual built folder and will reject a missing EXE.

After the blocker is fixed:

```powershell
.\Build.ps1
.\Run.ps1
```

Intended output: `out/win-x64/NeutronStar-WinUI-Mvvm.exe`, with the entire
self-contained unpackaged folder. No installer, trimming, Native AOT or
ReadyToRun is selected. Clean-machine native prerequisites and actual-window
behavior still need verification. Open `NeutronStar.WinUINative.slnx` in a
compatible Visual Studio for the app and independent model checks.
