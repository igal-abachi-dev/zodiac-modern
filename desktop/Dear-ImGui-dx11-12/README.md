# NeutronStar Dear ImGui / DirectX candidate

Independent C++20 implementation of the reference main workflow and full list/filter
workbench. Dear ImGui **1.93.0**, official unmodified Win32/DX11/DX12 backends,
native Win32 title bar, local fonts and native vector icons. No CEF, WebView2,
Electron, Go CLI, cryptography or application network API.

## Run

Right-click **Run.ps1 → Run with PowerShell** after building. Its default is:

```text
DX12 hardware → DX11 hardware → DX11 WARP if hardware is unavailable
```

Fallback happens only for capability/availability failures during DX12 startup.
Allocation errors, unexpected backend errors and later device/presentation failures
are terminal, not silent renderer switches. The selected API, adapter and any
fallback/software status appear in the window. RDP may support DX12, DX11 or only
software rendering depending on driver/session policy; RDP does not inherently
mean DX12 is unsupported.

```powershell
.\Run.ps1                    # default: prefer DX12, permit DX11 fallback
.\Run.ps1 -Renderer dx12     # strict DX12; never silently fall back
.\Run.ps1 -Renderer dx11     # strict DX11 hardware
.\Run.ps1 -Renderer dx11 -AllowSoftware  # permit DX11 WARP if hardware fails
```

Explicit DX12 remains hardware-only. A software/fallback run must be labelled and
kept separate from a primary hardware renderer comparison.

## Build

Windows 11 x64; Visual Studio C++/Windows SDK tools, LLVM/clang-cl, CMake 3.29+
and Ninja. Run `Init.cmd` once, then `Build.ps1`. The scripts locate Visual Studio
and use **CMake → Ninja → clang-cl → Microsoft link.exe**, Microsoft STL/SDK and
static CRT (`/MT`). Open the folder directly in Visual Studio for CMake development.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Run.ps1
```

`out/win-x64/neutronstar_imgui.exe` is the production application. Keep its whole
folder, including `assets/` and `Notices/`. Runtime DirectX/DXGI/D3DCompiler DLLs
come from Windows. .NET is required only for the optional external test tools.
The source archive SHA-256 is pinned in `Init.ps1`; it is an observed official
GitHub download hash, not an independent publisher signature. Dear ImGui is MIT;
local font/icon licences and source geometry are retained. No paid widgets.

## Implementation

- `src/domain.hpp`: independent workflow, deterministic fixtures, row operations
  and elapsed-time/generation-aware activity. No sibling UI/state imports.
- `src/ui.cpp`: light neutral/emerald controls, Decrypt left/Encrypt right,
  UTF-8 fixture, progress/cancel/reset, modal About, keyboard navigation/focus,
  responsive stacked cards, complete workbench and 10/30/60 Hz requests.
- `src/graphics.cpp`: WRL COM smart pointers and scoped handles; DX11 flip-model
  swap chain, DX12 command queue/frame allocators/fences/SRV allocation and
  back-buffer transitions. GPU waits are bounded; resources drain before resize
  and normal shutdown. Device loss does not change the API mid-run.
- `src/main.cpp`: decorated 960×640 DIP Win32 client, PerMonitorV2 DPI handling,
  standard resize/minimum size, native startup diagnostics and on-demand rendering.

Idle UI waits for messages instead of continuously redrawing. Active operations
and bursts schedule wakes; active text/mouse controls may redraw for interaction.
Minimized/occluded windows stop drawing, while elapsed-time state remains separate.
Their logical timer wakes currently coalesce to 100 ms; normalize or explicitly
separate this policy before comparing hidden high-rate workloads across toolkits.
This is a policy choice to report alongside continuously rendered implementations,
not evidence that ImGui has won idle CPU or power measurements.

Every matching row is submitted through the immediate-mode UI each rendered frame;
there is **no ImGuiListClipper** or virtualized list variant. Model rows/UTF-8 labels
are retained and cached, but ImGui does not retain 10,000 DOM/native control peers.
The renderer still clips offscreen drawing normally. This is a whole-stack
implementation difference, not an isolated language or GPU API experiment.

## Material parity limits

Stock Dear ImGui exposes no per-widget Windows UI Automation provider here.
Keyboard navigation/modal handling is implemented; this is **not** screen-reader
accessibility parity with the reference. A production UIA bridge/accessibility
solution would be separate work, with its overhead measured separately.

Inter/Noto Hebrew are loaded locally with wide-path-compatible bounded reads.
32-bit ImGui character support preserves supplementary UTF-8 code points; an
available Windows Segoe UI Emoji font is an optional OS-owned outline fallback.
Stock text drawing does not provide full bidi/complex-script shaping or browser-like
color emoji rendering. Hebrew code points/filter data remain exact, but the
display is not full RTL parity. Do not "fix" this by reversing stored text.
These limitations must be disclosed, or an explicitly shared ASCII/text lane
must be defined before comparing rendering performance. This candidate is not
an accessibility-equivalent professional product recommendation.

Icons use native draw-list primitives derived from the local Lucide geometry;
there is no runtime SVG parser or remote asset request. `imgui.ini` and automatic
ImGui logging are disabled. Inputs contain synthetic benchmark fixtures only.

## Verification

`Build.ps1` runs model tests. With the foreground desktop undisturbed:

```powershell
.\Validate.ps1
```

This checks both explicit renderers, auto selection, forced-unavailable fallback,
strict DX12 failure and production startup/drawing/shutdown. The separate
`neutronstar_imgui_probe.exe` records read-only widget rectangles and bounded
synthetic state for an external checker that sends real pointer/keyboard input.
It never accepts state-setting test commands. Its snapshot IO/fault injection are
compiled **out of production** and it is not installed by CMake.

These are **instrumented correctness checks**, not UIA, physical-presentation
timings or benchmark results. Later measurements must run the production EXE and
calibrate external pixel/presentation endpoints; the existing UIA collector cannot
simply assume stock ImGui widgets exist. See [VALIDATION.md](VALIDATION.md).

Official references: [release](https://github.com/ocornut/imgui/releases/tag/v1.93.0),
[DX12 example](https://github.com/ocornut/imgui/blob/v1.93.0/examples/example_win32_directx12/main.cpp),
[DX11 example](https://github.com/ocornut/imgui/blob/v1.93.0/examples/example_win32_directx11/main.cpp).
