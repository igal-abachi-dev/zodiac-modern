# Qt candidate validation

## Latest follow-up — 2026-10-31 diagnostics/accessibility

New evidence is separate under
[validation/2026-10-31-diagnostics](validation/2026-10-31-diagnostics).
The actual D3D11/DXGI device must now be verified hardware before Ready; the
observed hardware is NVIDIA GeForce RTX 2070 SUPER. Software scene-graph and WARP
runs fail with distinct messages. One-shot render probes disconnect after startup.

The application now carries app-local Microsoft CRT files plus qt.conf. Startup
tests pass from an isolated PATH/working directory and verify that loaded Qt/CRT
modules came from the published folder. Font/QML failures, a synthetic
sceneGraphError signal and override rejection exercise the diagnostic paths.
The probe is not shipped. A missing diagnostic-file writer is not silently accepted.

Full normal and synthetic contrast-palette UIA/keyboard checks cover the original
workbench, focus and lifecycle, plus narrow-layout keyboard scrolling, real Hebrew
keyboard filtering and accessible ValuePattern supplementary-character edits.
Accessible edits update the filter model via guarded textChanged handling.
Status announcements and contrast hints are implemented; actual spoken output
and live OS contrast integration have not been certified.

The first extended Unicode run failed when synthetic surrogate-key packets did
not round-trip emoji. That failed attempt is retained; this is not relabeled as
a passed IME test. The acceptance report distinguishes real Hebrew keyboard
input from whole-string accessibility edits. Actual preedit/commit/cancel and
supplementary-character keyboard/IME behavior remain physical review items.

Only one monitor and no Windows Sandbox are available here. A clean-machine
Sandbox package generator is provided but not run. The
[eight-item record and manual checklist](../DESKTOP-DIAGNOSTICS-2026-10-31.md)
defines these remaining gates. The earlier record below describes the earlier
artifact and its hashes, not the new executable. No comparative timing results
were regenerated.

Implementation and correctness checks: 2026-10-30/31, Windows 11 x64, 200% scaling.
No comparative benchmark cohort was run.

## Accepted evidence

Retained under [validation/2026-10-31](validation/2026-10-31): full external
`window.json`, main/narrow screenshots, Release build log, complete deployment
hash receipt, SDK acquisition provenance and source manifest. The window report
records the exact tested EXE SHA-256. The build receipt covers **all** files,
including DLLs/plugins/QML/notices, rather than only the small executable.

- Qt 6.12.0 official shared MSVC x64 kit; C++20, clang-cl 22.1.3,
  CMake 4.3/Ninja and Microsoft link.exe. Build graph checked to confirm the
  linker, not just the CMake cache variable. Dynamic `/MD` CRT.
- Both Release CTest suites pass: pure workflow/list contract, plus actual Qt
  model persistent-index identity, literal case-sensitive filtering, notifications
  and controller Stop/Back/reopen/reset behavior. App uses `/W4 /WX`.
- Full actual-window UIA3/real-pointer/keyboard suite passes: About Escape/Close,
  trigger restoration and Tab containment; simulation success/cancel/reset;
  1k/10k create/replace/reverse/splice/update/filter; requested 10/30/60 Hz,
  filtering during updates, Stop, remount, close while active and fresh reopen.
- Narrow 480 DIP cards stack, 960 DIP layout restores, screenshots reviewed.
  Task-owned host/helpers exit cleanly with code 0. Accepted report has no UIA
  provider gaps. UIA timings in that report are incidental correctness telemetry,
  not benchmark samples or physical frame latency.

## Corrections retained

The first accepted window used CMake's implicit lld-link. Final build explicitly
sets `CMAKE_LINKER_TYPE=MSVC`; setting only `CMAKE_LINKER` was insufficient with
this CMake/clang-cl combination. Initial evidence remains under `attempts/`.
An added Qt-linked model test initially could not find Qt DLLs (0xc0000135);
Build.ps1 now puts the selected kit's bin directory on its own process PATH before
CTest. The missing-DLL failure summary is retained. The application deployment itself
already contained Qt DLLs. Neither failure was discarded as a passing check.

The shared correctness checker now allows 40 ms between native cursor movement
and mouse press, and records input rectangles/EXE hashes. It does not rerun failed
actions. This is a correctness delivery change, not a speed optimization in Qt.

## Remaining gates

Physical Narrator/NVDA, IME/composition, contrast and multi-monitor/DPI transitions;
long lifecycle/soak runs; GPU/adapter/presentation/energy tracing; calibrated
cross-toolkit pilot/full measurements. Repeat native Qt checks with fresh clean
Windows machines and installed/missing VC++ runtimes before portable distribution.
The shared kit requires the compatible Microsoft VC++ x64 runtime; it is not
made self-contained by shipping Qt DLLs. No installer is silently launched.

QML/fonts/icons are embedded, Qt DLLs/plugins are external. Dynamically linked
LGPL module obligations, matching source/relinking rights, official SBOM and
third-party notices need independent distribution review. SDK archive checks use
published SHA-1 over TLS and record local SHA-256; that is not an authenticated
upstream SHA-256 lock. `/guard:cf` and linker mitigations apply to our target,
not a whole-dependency audit. This is a UI research candidate, not an audited
production decrypt receiver or completion of FUT-09's security gates.
