# Native WinUI MVVM validation — 2026-10-25

This is an **unpackaged Win32 desktop** candidate, using native WinUI 3 Fluent
controls, Windows App SDK 2.5.1 and Toolkit 8.4.2. It is not UWP, MSIX/Store or a
WebView2 UI. The Toolkit partial-property interop fix passes with warnings still
treated as errors. No comparative performance cohort has been run.

## Build and models

`Build.ps1` passes locked app/model restores, deterministic workflow/list/timer
assertions and self-contained Release publication. It verifies generated
`App.xbf`, `MainWindow.xbf` and `NeutronStar-WinUI-Mvvm.pri`, retains local fonts,
icons and notices, and records every published file/hash in the build receipt.
The .NET runtime configuration and precise artifact hashes are preserved in
[acceptance.json](validation/2026-10-25/acceptance.json).

The primary deployment is untrimmed JIT, with ReadyToRun/Native AOT disabled;
changing deployment mode would create a separate benchmark variant.

## Actual-window correctness

The accepted external UIA3 check exercises the actual published application at
192 DPI (200% scaling), without app-side test hooks:

- Ready, native ContentDialog Escape/Close/focus restoration and Tab containment.
- Synthetic encryption completion/reset and decryption cancellation/reset.
- Keyed 1k/10k replacement, reverse, splice, ten-percent updates, filtering,
  clearing and empty results; filtering during requested updates.
- Requested 10/30/60 Hz bursts, Stop, remount, leaving while active, fresh reopen
  with reset row IDs/tick and no stale timer activity; return focus/main workflow.
- 480 DIP card stacking through native scroll/alignment observations, and
  restoration to the 960 × 640 logical client baseline.
- Zero host exit code and clean exit of discovered process identities.

Raw attempts/screenshots are retained in `.cache/`. The final acceptance summary
identifies the accepted raw result. Incidental UIA elapsed values are **not**
renderer/script timings or a Tauri/Avalonia/Electron comparison.

## Earlier failures and checker changes

Earlier compile failures (sealed Viewbox inheritance and MVVMTK0045) are fixed.
Actual-window failures remain in `.cache/correctness-*` and
`.cache/dialog-diagnostic/`:

- The native ContentDialog template can expose `CloseButton` instead of the
  custom `about-close` ID. The external checker now distinguishes both from the
  native title-bar Close button. A double-click-delay hypothesis did not resolve
  it and was removed. The app gates its trigger until the dialog finishes closing.
- Keyboard entry now waits for actual text-box focus; list assertions poll
  through temporary row-peer detachment during normal collection resets.
- WinUI omits bounding rectangles for off-screen controls. Narrow-layout checks
  scroll each card into view and require aligned buttons/increasing vertical
  scroll position; visual capture waits for the return scroll to settle.

These changes belong to the correctness checker, not the frozen six-host
measurement collectors. They do not authorize discarding measured failures.
Native UIA availability/latency itself needs calibration before performance work.

## Remaining gates

Physical Narrator/NVDA, IME, high contrast, other DPI/multi-monitor conditions,
graphics API/fallback/GPU/energy, clean-machine native prerequisites and broader
lifecycle/security review remain open. This is a synthetic UI app with no Go,
crypto, private keys, passphrase input, arbitrary process execution or updater.
It is not a signed product release or an overall desktop-framework winner.
