# Dear ImGui candidate validation

2026-11-03. Main/workbench behavior implementation and renderer checks; **no
comparative benchmark, UIA/accessibility acceptance or real RDP acceptance**.

## Build and artifacts

- Dear ImGui 1.93.0 official archive, SHA-256
  `E21907FD8DD5EA59AA00538632A02AD0A3EDEDB4DDC533B94702331FBCD6C470`.
- C++20 Release: clang-cl 22.1.3, CMake 4.3/Ninja, Microsoft link.exe,
  Microsoft STL/static CRT and Windows SDK 26100; `/W4 /WX` for owned code.
- CTest domain contract passes: progress/generation cancellation/reset, invalid
  elapsed time, deterministic row IDs/updates/bounds, requested burst termination,
  Stop and workbench disposal/remount. Cached UTF-8 row labels move with their IDs.
- PE headers confirm CFG, high-entropy ASLR, dynamic base and NX compatibility.
  CET is requested at link time; hardware enforcement is not certified here.
- The published executable contains neither the probe/fault-injection command-line
  tokens nor the frame-snapshot marker. The probe executable is not installed.
  Fonts load through bounded wide-path-compatible file reads into atlas-owned
  buffers. Local Inter/Noto/Lucide licences and Dear ImGui's MIT licence are retained.

Exact source, production/probe hashes and complete published-folder manifest are
retained under `validation/2026-11-03/`. Production screenshots were reviewed;
the emoji is rendered as a monochrome outline on this system. Hebrew glyphs are
present but not correctly bidi-shaped. The original UTF-8 data is not reversed.

## Accepted checks

All checks below use the current executable hashes; earlier attempts remain separate.

| Path | Scope | Observed result |
| --- | --- | --- |
| Explicit DX12 probe | Full real pointer/keyboard suite | Pass; NVIDIA GeForce RTX 2070 SUPER, hardware |
| Explicit DX11 probe | Full real pointer/keyboard suite | Pass; same adapter, hardware |
| Auto probe | Startup selection | DX12, no fallback |
| Auto + forced DX12 unavailable | Startup fallback selection | DX11, fallback recorded |
| Strict DX12 + forced unavailable | Expected failure | Exit 2; no silent DX11 selection |
| Production DX12 | Actual-window startup/drawing/shutdown | Pass, exit 0 |
| Production DX11 | Actual-window startup/drawing/shutdown | Pass, exit 0 |

The full interaction checks cover About Escape/Close/Tab containment and trigger
focus restoration; completed encryption, canceled decryption and reset; initial
1k rows, 10k create, 1k replace, reverse/splice/update; exact/live/empty filtering;
10/30/60 Hz requests, Stop stability, remount, leaving active work, clean reopen;
and 480/960 DIP layout. They send actual Windows input, not state-setting commands.

**Instrumentation boundary:** stock ImGui has no per-widget UIA provider here.
The separate probe writes bounded read-only snapshots of submitted widget
rectangles and synthetic state. The collector rejects incomplete/frame-mismatched
reads. IO/fault injection are compiled out of production. These endpoints are
not physical presentation markers or unbiased performance measurements.
Production receives only startup/visual/shutdown smoke acceptance in this record.

## Corrected test/build failures

- Updated drawing API signatures for 1.93 and normalized CMake source paths before
  installation. Both build and model checks were rerun.
- Enabled 32-bit character support and merged the optional OS emoji font into each
  text face; this fixes supplementary glyph availability, not bidi/color shaping.
- Initial snapshot publication used file replacement. Some probe runs exited with
  code 1; a later native diagnostic identified `Probe publish failed` on the forced
  fallback path. Read sharing alone did not eliminate it. The protocol now uses
  explicit shared-file IO with matching frame markers; the final suite passes.
  These were test-instrumentation failures, not production device-loss evidence.
- Read-only test diagnostics now retain a bounded native failure stage/HRESULT.
  No comparative results were discarded/relabelled because none were collected.

## Open acceptance and comparison gates

- No stock widget UIA/screen-reader bridge; this is a material accessibility gap,
  not merely a missing Narrator test. Full bidi/complex-script shaping and color
  emoji parity also remain unimplemented. Use a disclosed common text lane or
  address those gaps before making equivalent-rendering/product claims.
- Actual RDP driver/session combinations and WARP fallback were not exercised;
  forced unavailability verifies selection logic only. Record actual API/adapter/
  software mode and reject mixed-adapter hardware comparisons unless intentional.
- Physical IME, Narrator/NVDA, OS high contrast, scale/multi-monitor moves,
  clean-machine delivery and extended GPU/device-loss/lifecycle stress remain open.
  The user deferred the physical checks; current screenshots use 192 DPI.
- The immediate-mode loop submits every matching row without a clipper, but is
  not a retained DOM/control tree. On-demand redraw, active-edit rendering and
  100-ms hidden logical wake coalescing must be reported/normalized in later tests.
- Calibrate production pixel/presentation/GPU/process-tree measurements before a
  benchmark cohort. Do not compare probe snapshot timing with other apps' UIA.
  Signing, distribution/licence review and independent security review are separate.
