# Reactor validation — 2026-10-26

Independent complete implementation; **experimental framework, not release approval**.
Reference: `../Tauri-v2-Svelte5/FEATURE-PARITY.md`, with the native MVVM candidate
used for additional WinUI styling/platform guidance. No sibling UI/state code is
imported. This project uses Microsoft.UI.Reactor **0.1.0-preview.16**, Windows App
SDK **2.5.1**, .NET SDK **10.0.403** and self-contained CLR **10.0.14**.
Unpackaged Win32 x64; JIT, untrimmed, ReadyToRun off. No UWP/Store requirement.

`Build.ps1` passes locked app/test restores, independent reducer assertions and
Release publication with warnings treated as errors. Assertions cover workflow
elapsed-time progress, success/cancel/reset, stale tokens, keyed row sequences,
immutable updates, filtering, remount and stale burst updates after Stop.
Native timer handlers are explicitly unsubscribed during Stop/disposal.
The published folder includes complete .NET/App SDK dependencies, compiled
XAML/PRI, local fonts/icons and generated dependency notices.

The external actual-window checker covers main operations/cancel/reset, controlled
About dialog Escape/Close/Tab containment/focus restoration, all unvirtualized
1k/10k replace/reverse/splice/update/filter workloads, requested 10/30/60 Hz,
Stop/remount, leave while active, fresh reopen and main workflow afterward.
It checks 480-DIP stacking, restored 960 × 640 DIP client layout and clean process
exit at the machine's **192 DPI / 200%** scale. Persistent final acceptance and
full published-folder hashes are in `validation/2026-10-26/`.

No cross-toolkit performance benchmark has been run. Raw input-to-UIA values in
correctness reports include retries, input settling and provider cost. They are
not unbiased render timings. The Reactor lane records longer 180-second semantic
and 30-second UIA deadlines; these do not excuse hangs or establish responsiveness.
Read-only recovered UIA gaps, when present, remain in the raw accepted report.

## Corrections and retained attempts

- The preview requires a controlled Reactor `ContentDialog`; the first imperative
  ShowAsync approach was rejected by its analyzer and replaced. Trigger enable
  state and focus restoration wait for the close render.
- Raw StackPanel layout does not supply the required named row peer. A Reactor
  SemanticPanel group now exposes the actual synthetic row subtree. Initial 10k
  UIA scans timed out and missed the checker's shutdown deadline; those failures
  are retained, not reclassified as accepted lifecycle results.
- Breakpoints use DPI-normalized Win32 client width. Using the desktop window's
  device-pixel width failed the initial narrow-layout check at 200% scaling.
  The checker also allows two stacked cards already visible in one viewport;
  it does not incorrectly demand another scroll-percent change in that case.
- Stop publishes accessible active/stopped help text. The checker waits for its
  committed UI state before sampling tick stability; cancellation invalidates
  tokens and detaches the timer handler.
- A fixed light fixture intentionally suppresses only the theme-token analyzer
  rule. Decorative images are hidden from accessibility. General accessibility
  analyzer rules remain active.
- Native style assignment/resource writes on every Render are not a styling
  strategy. A resource-rewrite experiment repeatedly invalidated the preview UI
  and failed readiness. It was removed. Buttons use documented `ApplyStyle` and
  the primary action uses declarative themed content, retaining a native Button
  for keyboard/focus/automation behavior. No framework source was patched.

Raw attempts remain in `.cache/first-check`, `dialog-check`, `extended-check`,
`semantic-group-check`, `stop-check`, `dpi-check` and `check-*`. A concise failed
attempt history accompanies the final acceptance. Layout-only runs are marked
as such and do not substitute for the full workflow check.

## Remaining gates

Physical Narrator/NVDA/IME/bidi, high contrast/theme adaptation, mixed-DPI and
multi-monitor, clean-machine deployment, GPU/device loss, longer lifecycle stress,
signing, independent review and comparative timing/resource/power cohorts remain
open. Preview API/support risk must stay explicit. The App SDK graph includes
WebView2-related assemblies, but this application creates native Fluent controls,
not a WebView2 browser. Full distribution size is not the small apphost EXE size.
Align/disclose CLR versions before comparing this with older .NET candidates.
