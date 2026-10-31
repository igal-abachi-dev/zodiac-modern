# Slint candidate validation

Implementation and correctness checks: 2026-10-30/31, Windows 11 x64, 200% scaling.
No comparative performance cohort was run.

## Accepted evidence

See [validation/2026-10-31](validation/2026-10-31): external `window.json`, reviewed
main/narrow screenshots, Release build log, full folder hash receipt, source
manifest and retained attempted checks. The accepted window report binds its
interactions to the exact published EXE SHA-256.

- Rust 1.99.1 MSVC x64, Slint/slint-build exactly 1.18.1; locked Cargo graph,
  Winit + Skia and AccessKit accessibility. UI/fonts/icons are compiled resources.
- Release model tests pass for workflow/stale-generation/progress and deterministic
  list IDs/reverse/splice/update/case-sensitive filtering/remount. Rustfmt and
  Release all-target Clippy with `-D warnings` pass.
- Full external actual-window checks pass: About Escape/Close/focus restoration
  and Tab containment; success/cancel/reset; complete unvirtualized 1k/10k list
  workload, filtering during updates, 10/30/60 requested Hz and Stop; remount,
  Back while active, fresh reopen and unaffected main simulation afterward.
- Narrow cards stack and restored wide layout works; accepted synthetic screenshots
  reviewed. Host/helpers exit cleanly with code 0; accepted run has no UIA provider
  query gaps. Report interaction times are correctness telemetry, not performance
  samples, actual FPS or physical presentation.

## Failures and checker calibration

Early runs stayed at Loading because the selected Skia/WGPU build does not expose
the graphics API AfterRendering notifier without additional upstream features.
Ready now follows show and one event-loop turn: it means actions are available,
not first physical paint. The early titlebar-only queries are retained; normal
AccessKit controls are exposed in accepted runs. No framework source was patched.

Initial immediate move/press Close inputs failed. The correctness checker now
lets CursorMoved reach the native Winit loop before pressing (40 ms), recording
the target rectangle. The first full run after that passed the complete workbench
but failed narrow layout because a fully clipped encryption button was absent
from AccessKit's tree. The checker now scrolls with real wheel input until both
buttons are visible, then compares their actual geometry. No hidden test endpoint,
application timing delay, failed-action retry or weakened workflow was added.
Retained failed reports remain under `attempts/`; earlier cache screenshots/logs
also remain. Frozen prior framework/host benchmark cohorts are unchanged.

## Differences and remaining gates

Slint repetition is positional; IDs remain stable data values but do not mean
keyed widget moves. VecModel emits changed-row notifications, ordinary repetition
is eager, and no virtualized ListView substitutes for 10,000 rows. Disclose this
when comparing reconciliation costs.

Stock Fluent controls use the platform/default accent; the light client does not
force the native caption light. About includes required AboutSlint attribution
with external activation blocked. Slint 1.18's public roles do not include Dialog:
the focus-contained overlay exposes a named group, not full dialog semantics.

Physical Narrator/NVDA, IME, contrast, multi-monitor/DPI transitions and prolonged
lifecycle checks remain open, as do actual GPU API/adapter tracing, physical paint,
power and cross-toolkit benchmark calibration. Do not derive graphics backend,
startup or memory rankings from Rust, Skia, EXE size or incidental UIA timings.

The selected desktop terms are Slint Royalty-free Applications License 2.0 with
AboutSlint attribution, not MIT. Published notices inventory the resolved Cargo
graph and Skia binary LICENSE_SKIA; independent distribution/license review and
clean-machine runtime/hardening validation remain gates. No signing, installer,
updater, Go CLI or product security review is claimed.
