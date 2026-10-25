# Electron implementation acceptance — 2026-10-24

**Implemented, built and checked as an independent comparison candidate.**
Evidence summary: [acceptance.json](validation/2026-10-24/acceptance.json).
No cross-toolkit performance results are claimed.

`Build.ps1` passed formatting, two workflow/list model tests, two local-resource
policy tests, TypeScript/Svelte checks (zero errors/warnings), the Vite production
build, a 15-file asset audit and Windows ASAR packaging. Dependency notices and
Electron/Chromium license files are retained. EXE/ASAR hashes are in the build
receipt; measure the entire distributed folder, not just those two files.

The final actual-window UIA3 check passed at **192 DPI / 200% scaling**:

- Main Ready, About/Escape/Close/focus and Tab containment, synthetic encryption
  completion, decryption cancellation and Reset.
- The complete 1k/10k keyed list, reverse/splice/ten-percent update and filter
  operations, including input during requested updates.
- Requested 10/30/60 Hz, Stop, remount, leave during activity, fresh reopening
  without stale ticks, return focus and another main-screen simulation.
- 480 DIP card stacking and restoration to 960 × 640 logical client geometry.
- Host exit code zero and all discovered helpers exited; no recovered provider
  gaps in this accepted attempt.

Raw result/screenshots: `.cache/accepted-correctness/`. Earlier failed attempts
are retained in `.cache/correctness-*`; the external checker needed waits for
asynchronous dialog/navigation completion. They are not accepted timing samples.

## Runtime policy probes

The separate `pnpm test:runtime` diagnostic uses the production main/assets in
the development Electron runtime. It passed: Node `require`/`process` absent
from the renderer, context isolation/sandbox/web security enabled, inline script
and eval blocked by CSP, remote fetch blocked, local entry 200, unknown map 403,
popup denied and only the three approved dialog style declarations present.
Actual runtime: Electron 45.0.0, Chromium 156.0.8078.48, embedded Node 24.22.0.

This probe is **not** the packaged-fuse or comparative performance test. A later
diagnostic attempt timed out waiting for animation-frame-based Ready while the
window was not brought forward; that failure remains in
`.cache/runtime-smoke/result.json`. The diagnostic now explicitly shows/focuses
its window, keeps background-throttling policy unchanged, uses per-attempt
directories and runs through Electron's waiting CLI wrapper. Its final successful
report is preserved in the acceptance summary. The packaged-window check passes
independently. No production browser-performance setting was changed for the probe.

Physical screen reader/IME/high contrast/other DPI, GPU/energy, broader lifecycle,
clean-machine delivery, signing and later Go/cryptographic boundaries remain open.
This implementation is a UI-only research app, not an approved product release.
