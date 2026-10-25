# Validation — 2026-10-24

This project is ready as the complete UI/behavior reference for the independent
Avalonia and Electron implementations. This is implementation acceptance for a
synthetic benchmark app, not approval of a shipping Zodiac product.

## Checked Release build

`Build.ps1 -Offline` passed:

- Seven frontend domain/workload/style-policy tests.
- TypeScript and Svelte checking: zero errors and zero warnings.
- Production build and asset audit: 17 local files, including the lazy workbench chunk.
- Rust formatting and two optimized native navigation/asset policy tests.

Executable SHA-256:
`F3DA443942ACB7CE47035CACE30EC919053F075E3EBEEC634FCB63C455CC641E`.
The native/frontend lock and manifest hashes are in `.cache/build-receipt.json`.

## Actual window checks

Installed WebView2 Runtime: `155.0.4283.62`.

The UIA3 main workflow passed on this executable: Ready, About/Escape/focus
restoration, About/Close, encryption/completion/reset and decryption/cancel/reset.
Evidence: `.cache/final-main-workflow.json`.

The separate reference-workbench checker passed: 10,000/1,000-row replacement,
keyed ordering, reverse, splice, ten-percent updates, filtering/clearing/empty
results, filtering during requested 30 Hz updates, requested 10/60 Hz updates and
Stop, remount, leaving during activity, fresh reopening with no stale ticks,
return focus and a subsequent main-screen simulation. Host exit code was zero;
all discovered helpers exited. One transient read-only UIA provider error was
retried successfully and remains recorded.

Evidence: `.cache/reference-workbench-20261024/result.json`.
Checker source: `../host-test-support/reference-workbench/Program.cs`.
These are correctness checks; their incidental elapsed values are not a new
comparative performance cohort or physical-paint measurements.

## Scope and remaining checks

See [the complete inventory](FEATURE-PARITY.md). Physical Narrator/NVDA, IME,
high contrast, multi-monitor/DPI trials and product release/signing remain open.
The new project has not yet had its planned short comparison with the historical
`Tauri-v2-Test`. Published six-host results describe the older frozen artifacts.

The standard Tauri/Vite/Svelte structure is reusable. Benchmark choices such as
incognito profiles, a local asset allowlist, no application IPC, denied browser
permissions and explicit browser-switch matching are deliberate policies for
this experiment. A feature-rich product should assess those individually, add
narrow typed native commands and least-privilege permissions when required, and
plan installation, signing, recovery and native accessibility validation.
