# NeutronStar — WinUI 3 + Reactor

Independent C# implementation of the complete [Tauri/Svelte reference](../Tauri-v2-Svelte5/FEATURE-PARITY.md).
This is **Microsoft.UI.Reactor 0.1.0-preview.16**, an experimental MVU/component
authoring layer over native WinUI 3. It is not React, React Native, WebView2 or UWP.
The application is an unpackaged Win32 executable using Windows App SDK 2.5.1.
It does not require Store installation or an MSIX package.

Run `Build.ps1`, then right-click `Run.ps1` → **Run with PowerShell**.
Build prerequisites: Windows 11 x64, .NET SDK **10.0.403**, Visual Studio C++/WinUI
build tools and Windows SDK 10.0.26100 or compatible newer tooling. Initial
locked NuGet restore requires network access. Copy the **entire** `out/win-x64`
directory when testing on another machine; the EXE alone is not the application.
The output includes self-contained .NET and Windows App SDK, generated XAML/PRI,
fonts, icons and dependency notices. It is unsigned research output.

`BenchRoot` owns the main UI and a separate workbench component. Pure reducers in
`Domain.cs` own immutable workflow/row state; `Pulse` supplies bounded elapsed-time
updates and invalidates stale generations. Native Fluent buttons, textbox,
progress bar and a controlled Reactor `ContentDialog` provide controls. The
standard decorated HWND has a 960 × 640 DIP client. A frozen light palette is
intentional; the scoped `REACTOR_THEME_001` suppression records that choice.
Decorative SVGs are hidden from accessibility. No generic command bridge exists.

The workbench materializes all 1k/10k keyed rows. It includes replace, reverse,
splice, update, case-sensitive filtering, requested 10/30/60 Hz bursts, Stop and
remount. Leaving disposes its timer. Main controls simulate two-second operations;
they never open files, call Go, perform cryptography or use the network.

The WinUI MVVM candidate is a styling/platform reference only. This project owns
its component tree, state, lifecycle and build. Assets/specifications may match
other candidates; no sibling UI or runtime state package is imported.

Build/model/window-check status and outstanding gates belong in `VALIDATION.md`.
No comparative performance results exist for this candidate. Keep the preview
status, native-control differences, unvirtualized-list behavior and complete
deployment footprint explicit in any later comparison.

References: [Microsoft Reactor](https://github.com/microsoft/microsoft-ui-reactor),
[resolved package](https://www.nuget.org/packages/Microsoft.UI.Reactor/0.1.0-preview.16).
Read-only reference checkout inspected at `6a4b8bd9bcc64121ca7d01b9a947172d82026e55`.
