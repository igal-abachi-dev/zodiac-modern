# NeutronStar — Qt Quick / QML / C++

Independent Windows 11 implementation of the complete
[Tauri/Svelte reference](../Tauri-v2-Svelte5/FEATURE-PARITY.md): simulation actions,
About/focus handling, responsive layout and the entire list/filter workbench.
No browser, Go CLI, cryptography, real files or runtime network calls.

## Build and run

Run `Init.cmd` to build/test/deploy. Then right-click `Run.ps1` → **Run with
PowerShell**, or launch `out/win-x64/neutronstar_qt.exe`. Keep the complete
published folder together: the EXE alone is not a Qt distribution.

Prerequisites: Visual Studio C++ tools, Windows SDK, LLVM clang-cl and bundled
CMake/Ninja; Python 3 for notices; **Qt 6.12.0 MSVC 2022 x64 shared kit**. Set
`QT_ROOT` to its root, or use `../.cache/qt-toolchain/6.12.0/msvc2022_64`.
The tested compiler is clang-cl 22.1.3, using the Microsoft ABI, STL/CRT and
`link.exe`. CMake explicitly selects the MSVC linker type: recent CMake otherwise
defaults clang-cl to lld-link even when `CMAKE_LINKER` is set.
Build now copies the compatible Microsoft VC++ x64 redistributable DLLs beside
the application and writes a relocatable qt.conf. It does not run an installer.
Clean-OS deployment still needs the separate VM acceptance check.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1
.\Run.ps1
```

`scripts/Acquire-Qt.py` restores the selected official SDK archives with
`requests` and `py7zr` in a workspace Python environment. It records provenance
in `../.cache/qt-toolchain/acquisition.json`. The upstream archive SHA-1 values
are checked over HTTPS; locally recorded SHA-256 values are an inventory, not an
independently authenticated upstream pin. An existing official Qt installation
is also supported. Acquisition is an explicit setup step, never app startup.

## Implementation

C++20, RAII/QObject ownership, typed QML properties/signals, QAbstractListModel
and QSortFilterProxyModel. Qt Quick Controls **Basic** provides standard free
buttons, input, dialog and progress mechanics; local tokens style their surfaces.
Qt Quick RHI is explicitly Direct3D 11. QML, fonts and icons are embedded resources.
Qt DLLs/plugins remain external. The official shared kit requires `/MD`; the
NeutronStar host's static `/MT` CRT is deliberately not copied.

Rows use stable IDs and persistent-index remapping on reverse. `Column` +
`Repeater` creates the full unvirtualized list, including 10,000 rows. Elapsed
time drives simulation progress; QChronoTimer requests the list update cadence.
Stop/Back/remount/window close invalidate activity. Requested Hz is not FPS.
Readiness follows local fonts, verified actual D3D11 hardware and frame callbacks,
not physical display. Software adapters fail the primary benchmark policy.

Build runs two meaningful CTest suites, deploys with `windeployqt`, generates
third-party notices and hashes the entire folder in `.cache/build-receipt.json`.
`/W4 /WX /permissive-`, CFG, ASLR, DEP and CET compatibility flags cover our
compiled target; they are not an audit of the prebuilt Qt dependency graph.

## Licenses and evidence

Uses dynamically linked open-source Qt modules; LGPL/GPL texts, upstream SBOM
attributions and asset notices are included. Distribution requires the applicable
Qt obligations, matching source/relinking rights and separate legal review.
No commercial modules are needed. This document does not relicense repository code.

See [VALIDATION.md](VALIDATION.md). Comparative benchmarks, physical screen-reader,
IME, contrast and multi-monitor review remain separate gates.

The [Stremio assessment](../desktop-gui.md#1320-stremio-native-media-shell-rust-core-and-web-renderer-2026-10-31)
compares its older Qt5/WebEngine/MPV video path with this native Qt6 fixture.
No video, ANGLE, WebEngine or tray integration is needed here. Selecting D3D11
pins the requested API, not a verified hardware adapter: software adapters and
scene-graph overrides still need detection in the measurement preflight. Keep
the current list-notification policy until an explicit comparison variant is
defined. This research update changes no executable or accepted evidence;
the retained source manifest describes that earlier acceptance snapshot. The
later implemented follow-up is [recorded here](../DESKTOP-DIAGNOSTICS-2026-10-31.md).

## Diagnostics and accessibility follow-up

`--diagnostics <file>` explicitly exports fixed-schema startup events and actual
GPU identity; it is off by default. `--verify-startup --no-dialogs` exits after
verified readiness and rejects renderer environment overrides. Font/QML/graphics
failures have native messages. A 30-second event-loop watchdog handles missing
readiness while the GUI loop remains responsive; external test deadlines remain
necessary for a completely hung process/driver.
The API/adapter probe runs on the render thread; native error/UI work runs on the
GUI thread. Fonts and graphics must pass before action buttons become usable.

`scripts/Test-Startup.ps1` checks normal isolated deployment, loaded Qt/CRT origins,
font/QML failure, a synthetic scene-graph signal, software-backend/WARP rejection
and override rejection. `scripts/Test-Accessibility.ps1` runs full window checks
in normal and test-only contrast palettes. Controls follow Windows high-contrast
palette hints, status updates announce politely, and accessibility text edits
update the same filter model. These do not close physical AT/IME/monitor gates.

`scripts/New-CleanMachineCheck.ps1` prepares an offline Windows Sandbox package
without installing Windows features or launching a VM. See the linked checklist
for the still-open clean-machine and physical accessibility acceptance.
