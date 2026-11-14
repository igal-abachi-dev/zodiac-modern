# Desktop cross-toolkit measurement protocol

2026-11-14. Separate from the frozen six-host WebView2 collector (`../measurement/`), whose source and results are
unchanged. Only its `Native.cs` and `ProcessTree.cs` are linked (read-only). This collector measures the eleven
independent desktop candidates (twelve variants: Dear ImGui DX12 and DX11 are separate).

## Clock and frame source

Pixel endpoints use **DXGI Desktop Duplication**. Each frame carries `LastPresentTime`, a QPC timestamp of the
compositor's present, on the same clock as `Stopwatch.GetTimestamp`. The client rectangle is cropped on the GPU and
reduced to a 64×40 RGB grid (every 4th pixel averaged per cell). This replaced the plan's Windows.Graphics.Capture
because it needs no WinRT interop, yet still provides compositor present times.

Limits to carry into every result:
- It is the compositor present time, **not photon scan-out**. Resolution is bounded by the monitor refresh interval.
- Frames are delivered only when the desktop changes; a static screen produces no frames.
- Capture reads back pixels and costs collector CPU/GPU, outside the target process tree but on the same machine.
- The window must be unoccluded and in the foreground; other windows are not controlled.
- Pointer-only updates (`LastPresentTime == 0`) are counted and ignored.

## Calibration (`calibrate`)

A synthetic WinForms window flips colour on mouse-down. Injected `SendInput` click → first presented frame showing
the change gives the **pipeline floor** (30 samples after 5 warmups, two repeats). It is not a toolkit result; report
it next to every latency table and do not subtract it silently.

## Visual states (`reference`)

For each variant a ready-state reference grid is recorded in a fresh process (twice, to estimate the visual noise
floor). The Ready state is reached by UIA semantic Ready, or a fixed wait for Dear ImGui (no UIA provider), followed by
1.5 s with no new frame. A cell differs if its mean absolute channel difference exceeds 8 (of 255).

- **Window visible**: first visible NeutronStar HWND after process launch.
- **First frame**: first presented frame in the client region.
- **First content**: first frame with ≤25% differing cells.
- **Visual ready**: first frame with ≤1% differing cells and no deviating frame for 500 ms.
- **UIA ready** (secondary, 10 UIA-capable variants): "Ready" text plus both action buttons enabled; includes
  provider/polling cost and is not comparable with the pixel endpoint.

The per-frame difference series is stored (`frames.json`), so thresholds can be re-evaluated without new runs.
Reference images are per variant: they establish *that variant reached its own settled Ready state*, not that all
toolkits look identical (see DESKTOP-VISUAL-PARITY.md).

## Interaction scenario (`interact`)

One process lifetime per run, 17 timed steps, all with real injected input (`SendInput`):
main screen (About open/close, decrypt start, cancel, reset, encrypt start and completion, reset) then the workbench
(open, 10,000 rows, 1,000 rows, reverse, splice 10, update 10%, filter-to-one by typing, filter clear by Backspace,
remount, back to main screen).

- Pointer: move to the control centre, button down, wait until the window is quiet, **then button up is the timed event**,
  so the pressed-style frame is not counted as the app's response. Keyboard steps time the key batch itself.
- **First change**: first presented frame (client region, mean grid difference > 0.002 of 255) at or after the input.
- **Settled**: the last such frame before 300-500 ms of silence (400 ms after the filter has focus, because caret blink
  would otherwise sit inside the window). Settled includes toolkit-standard animations (for example WinUI control
  transitions), so it is not pure "work time"; report first change and settled together.
- Encrypt start and decrypt start are timed to first change only (progress animates); `completeMs` is the last change before
  800 ms of silence.
- Targets: UIA lookup for the ten UIA apps (lookup is outside every timed interval); frozen client coordinates for Dear ImGui,
  recorded once from the read-only probe build (`targets`). React Native Windows resolves the workbench toolbar once while the
  list is small, because UIA searches in a 10k-row tree exceed the UIA timeout; other toolkits scroll their page and are resolved live.
- Correctness: reset and back-to-main final states are compared with the variant's own Ready reference (hard limit 5% of cells
  for reset, 50% for the back-to-main step because several toolkits keep scroll offset or show a scroll indicator).
  UIA is **not** used as a timing endpoint here (the plan's secondary UIA timing was dropped for actions and lists); the
  functional behaviour was proven by the candidate correctness checker immediately before the cohort.
- Not measured: the 10/30/60 Hz burst workloads. A one-digit tick change is below the pixel-change threshold, so
  presented-update cadence cannot be recovered from this frame source.

## Idle scenario (`idle`)

One lifetime visits five states (visible, unfocused, occluded, minimized, restored); each state is sampled for 6 s after 1 s
of settling. The state order is rotated per lifetime. Private working set (Process V2 counter), private bytes, CPU seconds
over the run-owned process tree and per-process GPU engine/memory (PDH, secondary) are recorded.

## Run budget

Lean, because the windows are static: startup **3 warmups + 20 measured rounds** per lane (12 variants, 14 lanes);
idle **1 warmup + 3** lifetimes; interact **1 warmup + 8** lifetimes. Medians and bootstrap intervals are coarse at
n = 3-8 and p95 is the maximum or near it; widen only lanes that matter for a decision, with the extra rounds declared
in advance rather than rerunning until a favourite wins.

## Cohort rules

- Direct launch only. Fresh versus retained browser profile applies only to Tauri and Electron (`--profile`).
- Client area calibrated externally to 960×640 DIP, as in the six-host collector; any resize is recorded.
- Complete published-folder hashes (and collector/reference hashes) are frozen; a changed file stops the cohort.
- A failed attempt stops the run and is retained; nothing is replaced. Normal close must exit the host and every
  run-owned helper with code zero; a forced kill never counts as success (it is used only to clean up after a failure).
- Seeded randomized order. Independent process lifetimes are the statistical unit.
- Other applications keep running and are uncontrolled. Environment, adapter and runtime identities are recorded.

## Not measured here

Photon scan-out, post-reboot cold start, Explorer launch gesture, energy, physical assistive technology, IME,
clean-machine deployment. Absent metrics are reported as not measured, never zero.
