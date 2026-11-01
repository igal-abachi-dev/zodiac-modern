# NeutronStar wxWidgets candidate

Independent C++20/wxMSW implementation of the complete
[Tauri/Svelte feature inventory](../Tauri-v2-Svelte5/FEATURE-PARITY.md).
It uses free standard wxWidgets controls, a native Win32 window and local assets.
There is no WebView, browser engine, Go CLI, cryptography or application network API.

## Build and run

Windows 11 x64; Visual Studio C++ tools, Windows SDK, LLVM/clang-cl, CMake 3.29+
and Ninja are required. The scripts locate these through Visual Studio's installer.
Validated versions and checks are in [VALIDATION.md](VALIDATION.md).

1. Run `Init.cmd` once to obtain the pinned wxWidgets 3.2.12 source archive.
2. Run `Build.ps1` to compile the static wx libraries/application, run model tests
   and publish `out/win-x64/`.
3. Right-click **Run.ps1 → Run with PowerShell**, or execute it from PowerShell.

For a process-scoped execution-policy invocation:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Run.ps1
```

Keep the **whole published folder**, including `assets/` and `Notices/`.
It uses CMake → Ninja → clang-cl → Microsoft link.exe, Microsoft STL/SDK,
static wxWidgets and static CRT (`/MT`). First source compilation is substantial;
later builds are incremental. CMake also supports opening this folder in Visual Studio.
Application warnings are errors; upstream includes are treated as system headers.
CFG/ASLR/DEP/CET flags and a PerMonitorV2 manifest are enabled; these are mitigations,
not a security certification. The archive SHA-256 is pinned in `Init.ps1` and was
recorded from the downloaded official release, not an independent publisher signature.

## Implementation and parity

`src/domain.hpp` owns workflow/row transitions. `src/main.cpp` owns native controls,
RAII private font registration and UI-thread timers. Main operations use elapsed
monotonic time and generation checks. Leaving/remounting the workbench stops its timer.
The two-second 10/30/60 Hz bursts are requested update rates, not achieved FPS.

The list uses **normal wxListCtrl report mode, without wxLC_VIRTUAL**. Every row
is inserted and stored eagerly in the native list. It does not create one HWND
per row. Value-only updates change touched row text; structural/filter changes
rebuild native items, so item-selection/UIA identity differs from keyed DOM reuse.
Native clipping/painting and text/emoji rendering also differ from the web reference.
Do not characterize this as an isolated language/graphics-engine comparison.

Inter and Noto Hebrew are process-private local fonts; glyph fallback remains
Windows-dependent. Lucide SVGs are local. Standard native buttons, gauge, edit,
dialog and list retain Windows appearance instead of reproducing Ark pixels.
The dialog is modal with Escape/Close/Tab containment and trigger focus restoration.
The main screen stacks at narrow widths inside a native scroller.

`tools/rasterize_icons.cpp` is a build-time utility used to derive RNW's local PNG
icons from the same trusted Lucide sources. It is not a runtime dependency or
published application component.

## Validation and remaining work

Run the external checker from `desktop/`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File host-test-support/candidate-checks/Run.ps1 -Candidate Wx
```

Leave the foreground desktop undisturbed. These checks establish synthetic UI
correctness, not comparative performance or screen-reader acceptance. See
[VALIDATION.md](VALIDATION.md) for results and deferred physical/clean-machine gates.
wxWidgets uses the wxWindows Library Licence with its linking exception; notices
and font/icon licences are retained. Distribution still needs a licence review.
