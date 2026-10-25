# Avalonia implementation acceptance — 2026-10-24

**Implemented, built and checked as an independent comparison candidate.**
Evidence summary: [acceptance.json](validation/2026-10-24/acceptance.json).
No Tauri-versus-Electron-versus-Avalonia performance cohort has been run.

`Build.ps1` passed locked restores, the workflow/list/timer model assertions and
self-contained Release publication with zero compiler warnings/errors. Compiled
AXAML bindings and Toolkit source generation are enabled. The actual published
file manifest, apphost/DLL/lock hashes and notices are in `.cache/build-receipt.json`
and `out/win-x64/`; the apphost EXE alone is not the application footprint.

The final actual-window UIA3 check passed at **192 DPI / 200% scaling**:

- Ready; About/Escape/Close/focus restoration and Tab containment.
- Encryption completion/reset; decryption cancellation/reset.
- 10k/1k keyed row identities, reverse, splice, update, filter/clear/empty results.
- Filtering during requested 30 Hz activity; requested 10/60 Hz activity and Stop.
- Remount, leave while updating, fresh reopen without stale ticks and return focus.
- Main workflow after leaving the workbench; 480 DIP card stacking and restored
  960 × 640 logical client baseline.
- Zero host exit code and clean exit of all discovered process identities; no
  recovered provider gaps in this accepted attempt.

Raw result and synthetic screenshots:
`.cache/accepted-correctness/{result.json,main.png,narrow.png}`. Images were
visually inspected; a variable-font weight mismatch, two icon-path issues and
wide-layout spacing were corrected before this accepted build. The committed
font provenance records the final TTFs decompressed from pinned web fonts.

Earlier attempts remain in `.cache/correctness-*`: the checker initially clicked
Windows' title-bar Close instead of the dialog button, then dispatched input
before native visibility/layout settled. Explicit dialog IDs and correctness-only
layout stabilization corrected those external test defects. Do not silently use
their incidental timing values as renderer benchmarks.

Physical Narrator/NVDA, IME, high contrast, other DPI/multi-monitor configurations,
GPU API/fallback/energy, clean-machine deployment and broader lifecycle/security
review remain open. This app does not exercise the real Go/passphrase/crypto path,
and is not a signed product release.
