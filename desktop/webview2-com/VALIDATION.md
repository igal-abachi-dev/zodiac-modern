# Raw Rust host validation

Executed 2026-10-18; Rust **1.91.1**, x86_64-pc-windows-msvc,
webview2-com **0.39.1**, windows **0.62.2**. Installed WebView2 observed:
**155.0.4283.60**. No comparative benchmarks or production acceptance.

- `Build.ps1 -Offline`: asset verification, formatting,
  `cargo clippy --all-targets -- -D warnings`, three policy/Windows-handle tests,
  and optimized Release build all **passed**. Cargo graph is locked.
- Tests cover canonical origin, unsafe/reserved path segments, all percent-byte
  boundaries, MIME types, actual disk/final-handle confinement, and detecting
  an overlapping future profile before creating directories.
- Final executable SHA-256:
  `cf739acec35fc83e1a82f40a94fbfd37c0ddf912182d7a019e52a2eb63f7d713`.
  Common 17-file production manifest:
  `211ec53bbf3677974de1f1987aaadba58530739662dadcf5763bb300029f6902`.
  Receipt: `.cache/build-receipt.json`.
- CFG added explicitly after inspection found it missing. Final PE contains
  CFG checks/table flags, ASLR/high-entropy VA and DEP. CET marker absent.
  See [hardening evidence](../host-test-support/HARDENING.md).
- Production UIA/real-input workflow passed with exit 0 after CFG enablement:
  Ready, About/open/close, encryption simulation/completion, Reset,
  decryption simulation/Cancel, Reset, WM_CLOSE.
  Evidence: `.cache/native-smoke-cfg.json` (before later stylistic Clippy cleanup).
- Final visible `dist-test` native fixture **passed**, exit 0, four resource
  rejections and one external-navigation rejection. This includes multilingual
  content/assets, dialog focus/Escape, cancel/stale generation/progress,
  style/CSP/error/storage checks and 403/404 assertions.
  Evidence: `.cache/policy-smoke-visible.jsonl`.
- Three bounded early-close probes exited 0: before Ready, at environment
  completion, and at controller completion. Evidence:
  `.cache/close-before-ready.jsonl`, `.cache/close-at-environment.jsonl`,
  `.cache/close-at-controller.jsonl`. These preceded the stylistic Clippy cleanup;
  they do not prove delayed browser-helper exit or exhaustive callback safety.

## Preserved failures and boundaries

Earlier UIA checker selection/input failures are retained, not benchmark samples.
A hidden `dist-test` run failed before external navigation; the same fixture
passed visibly. Dialog focus is visibility-dependent, so the hidden failure is
not waived as successful evidence. Hidden-focus compatibility remains open.
No claim of complete policy/lifecycle/a11y parity follows from these checks.

Pending: independent unsafe/FFI/asset-race review, sanitizer configuration,
browser-helper identity/exit tracking (including late async callbacks), repeated
early-close stress, supplemental workloads, real keyboard/AT/IME, high contrast,
multi-monitor/DPI, packaging and Fixed Version runtime checks. Optional C++
titlebar/memory/native-message APIs are outside this benchmark-path port.
