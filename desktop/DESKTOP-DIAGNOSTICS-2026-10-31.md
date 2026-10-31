# Qt and NeutronStar host follow-up

The code and automated portions of the eight follow-ups are implemented; physical
acceptance remains explicitly open below. Source/runtime changes require
new correctness evidence; the older performance cohorts remain historical and
are not reinterpreted using the new executables. No comparative benchmark was run.

The user explicitly deferred the physical/clean-machine acceptance checks on
2026-10-31. They remain incomplete; no additional confirmation is needed to
resume them later when the required environment/listener is available.

| Item | Implemented | Acceptance scope |
| --- | --- | --- |
| Qt: verify actual graphics | Render-thread QSG API query, actual D3D11 device → DXGI adapter, software flag/vendor/device/description; Ready requires verified hardware | Hardware observed on RTX 2070 SUPER; software backend and WARP adapter rejected; preflight rejects renderer overrides |
| Qt: actionable startup errors | Fixed native errors for font, QML, scene graph, adapter/API and timeout; optional explicit JSONL diagnostics | Font/QML failures and a synthetic sceneGraphError signal exercise the real handling path; no GPU-driver crash was induced |
| Qt: deployment | App-local Microsoft CRT, explicit relocatable qt.conf; isolated PATH/cwd and loaded-module-origin checks | Local isolated deployment passes; a genuinely clean Windows VM remains unrun |
| Qt: accessibility | System contrast palette support, semantic label association, polite status announcements, accessible edits synchronized with the model | Normal and synthetic contrast-palette full UIA/keyboard/Unicode smoke; physical AT/IME/OS contrast/multi-monitor gates remain open |
| Host: runtime diagnosis | Stable-only installed-runtime probe with matching environment options; separate missing Evergreen, unusable Fixed Version and probe-error messages | HRESULT classification tests, real unusable Fixed Version case, installed stable-runtime checks; no uninstall/registry mutation of the host machine |
| Host: process failures | Typed numeric kind/reason/exit-code fields; no process descriptions/frame URLs | Real controlled renderer/browser termination, with optional fields populated on this runtime |
| Host: failure-path tests | Pending synthetic action during owned-child termination; stale completion rejection; host/helper cleanup; native error text wraps | Controlled termination requires a unique profile, descendant chain and PID/creation identity; no unrelated browser is terminated |
| Host: recovery separation | Primary failure remains terminal; no Reload, recreation, replay or retry policy added | Failure tests require exactly one environment creation and nonzero exit; interactive error windows remain readable until closed |

## Run the automated checks

From `desktop/`, after building Qt and the host:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Qt/scripts/Test-Startup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File Qt/scripts/Test-Accessibility.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File webview2-raw-bench/NeutronStar-Host/scripts/Test-Host.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File webview2-raw-bench/NeutronStar-Host/scripts/Test-Failures.ps1 -RunnerPath webview2-raw-bench/NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe
```

Only synthetic fixture data is used. Window tests need an undisturbed interactive
session. Readiness/diagnostic probes disconnect their per-frame hooks after
startup; adapter inspection is not left running on each update. Their startup
work is part of the new implementation and must be frozen before measuring.

## Clean-machine check, still requiring another environment

`Qt/scripts/New-CleanMachineCheck.ps1` prepares a Windows Sandbox configuration,
read-only application payload and a separate writable results folder under
`.cache/clean-machine-*`. Networking and clipboard redirection are disabled;
virtual GPU is enabled. It neither enables Windows features nor starts a VM.
Open the generated `.wsb` on a machine with Windows Sandbox, or copy its payload
to an equivalent clean Windows 11 VM. Verify `results/result.json`, the exact
EXE hash, native error absence and the reported graphics adapter.

Windows Sandbox is unavailable on this machine. Isolated PATH/module-origin
checks are valuable deployment evidence, **not** a substitute for that clean OS
test. A software-only VM may load the package but fail the hardware-rendering
acceptance policy; do not relabel that failure as a successful benchmark start.

## Physical accessibility checklist, still open

Use only the synthetic fixture. Retain tool/OS versions, settings, observations
and any failure; do not check these off from a UIA report alone.

- Narrator and/or NVDA: navigate both cards, About and filter by keyboard; listen
  for names/roles, Ready/simulation completion/cancellation announcements; check
  focus containment/restoration and that 10/30/60 Hz ticks do not flood speech.
- Actual Windows contrast themes: check live switching, readable text, input,
  button states, focus outlines and decorative-icon handling. The test-only
  black/white/yellow palette proves branch behavior, not OS integration.
- A real IME: preedit, candidate selection, commit/cancel, caret/selection and
  Hebrew/bidi editing. Real Hebrew Unicode key input and whole-string accessible
  ValuePattern emoji edits are already separate automated lanes. Synthetic
  surrogate-key packets did not behave like committed IME text and remain an
  unaccepted input path; the failed exploratory report is retained.
- Two monitors at different scales (100/150/200% where available): move the
  app/dialog, tab to lower controls, resize and verify text sharpness, bounds,
  hit targets and focus. This machine exposes only one monitor, so a real
  multi-monitor transition is not claimed.

The published executable has no `--inject` option. Failure/contrast injection
exists only in `neutronstar_qt_probe`, which is not installed in the application
folder. Neither UIA success nor these diagnostics certify a production receiver.
