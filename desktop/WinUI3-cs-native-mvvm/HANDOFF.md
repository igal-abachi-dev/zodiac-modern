# Resume here — 2026-10-24

User requested pausing this candidate until the session allowance resets.
No GUI instance or benchmark is running for this project.

## Implemented source / verified work

- Independent app/project, App/MainWindow XAML, standard free Fluent controls,
  ContentDialog, responsive layout logic and static Lucide geometry wrapper.
- Local Inter/Noto Hebrew assets, licenses and font provenance.
- Own Toolkit main/list models, generation-aware timer cancellation/disposal,
  dispatcher clock, full reference row/filter/rate/remount operations.
- Pinned NuGet graph and lockfiles; app/model restores succeeded.
- `dotnet run --project Tests/ModelTests.csproj -c Release --no-restore` passed
  the workflow, progress, cancel/reset, IDs, filtering, updates, rates, Stop,
  remount, reopening and disposal assertions.
- Build/Run scripts and root `.slnx` are present. Published app acceptance is open.

## Current compile blocker

**App model clarification:** this is an unpackaged Win32 desktop application
(`WindowsPackageType=None`), not UWP and not a Microsoft Store/MSIX application.
WinUI 3 exposes Windows Runtime (WinRT) APIs; C#/WinRT supplies their .NET
interop. The diagnostic below concerns that interop/source-generation layer,
not the UWP app model. Fixing it does not require changing our deployment model
or adding UWP/Store restrictions.

Last command: `powershell.exe -NoProfile -File Build.ps1`.
Restore and model assertions passed; application publication failed with
**MVVMTK0045**, treated as an error by our warnings policy:

> Fields using `[ObservableProperty]` are not AOT compatible in WinRT scenarios;
> use partial properties so CsWinRT can generate the required marshalling code.

Affected fields are in `Models/Models.cs`: loaded, running, workbenchOpen,
progress, status, workbench, rows, query and tick. Convert these to the supported
Toolkit partial-property pattern and adjust direct field initialization/references.
Do **not** suppress the warning or disable warnings-as-errors. This requirement
applies to the WinRT binding model even though this primary candidate uses JIT.
Reference: https://aka.ms/mvvmtoolkit/errors/mvvmtk0045

An earlier compile error derived `LucideIcon` from sealed WinUI `Viewbox`; that
was corrected to a `UserControl` containing a Viewbox. Earlier XAML local-type
resolution failures occurred while the local assembly failed to compile; recheck
them after fixing the current source-generator errors rather than assuming all
remaining XAML is already valid.

## Next steps

1. Fix partial properties, rerun independent model assertions and application
   build. Resolve any remaining native/XAML API issues using WinUI documentation.
2. Verify published App/MainWindow XBF and PRI files, local fonts and all runtime
   resources; retain notices and full artifact hashes.
3. Run the actual window and check all reference features, ContentDialog
   Escape/Close/Tab/focus, 1k/10k/filter/rate/remount behavior, reopening, 480/960
   DIP layouts and clean exit. Extend the **external** candidate checker to this
   app; it currently supports Avalonia/Electron only. Do not change frozen
   six-host collectors or add app test hooks to bypass UI behavior.
4. Check the workbench toolbar at narrow widths, font fallback/weight and
   ContentDialog Close automation targeting; these are unverified.
5. Record actual evidence in VALIDATION.md and update the comparison plan only
   when checks pass. Physical AT/IME/contrast/other DPI and performance collection
   remain later gates. No performance benchmark has been run.

The Avalonia implementation is a design/behavior reference, not an imported UI
or runtime model. Tauri's complete FEATURE-PARITY.md remains the common contract.
