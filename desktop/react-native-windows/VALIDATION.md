# React Native Windows validation

2026-11-02. Independent complete main/workbench candidate; no comparative benchmark.

- RNW 0.85.0, React Native 0.85.3, React 19.2.3, TypeScript 6.0.3,
  Node 24.21.0; exact npm lock/integrities retained.
- Official cpp-app Win32/Fabric template; MSVC v145/MSBuild 18, Windows SDK
  10.0.26100.0, self-contained Windows App SDK 1.8.260508005 and app-local CRT.
  Native NuGet restore passes in locked mode. PowerShell 7.6.1 local tool restore
  passes; no global shell/OS policy installation is performed.
- Strict TypeScript checks and both model tests pass: generation-safe progress,
  cancellation/reset, invalid elapsed time, complete deterministic row sequence,
  filtering, remount and bounds.
- Production bundle is minified and compiled to optimized Hermes bytecode.
  The final source map's App.tsx content matches the actual source. No Metro
  server is started. The native build now fails immediately on bundling failure,
  preventing stale bytecode reuse. Upstream Hermes warnings about guarded web
  globals remain in the build log; they are not suppressed or labelled app errors.
- Final full UIA3/real pointer and keyboard suite **passed**, at 192 DPI:
  About Escape/Close/Tab containment and focus, encrypt complete/decrypt cancel,
  reset, 1k/10k replace/reverse/splice/update, exact/empty/live filtering,
  requested 10/30/60 Hz activity, Stop stability, remount, leaving active work,
  fresh reopen, focus restoration, main workflow after workbench and 480/960 DIP
  layout. The app and all discovered helpers exited normally, exit code 0.
  Two read-only UIA provider query gaps were recovered; they are recorded in the
  report and are not interpreted as application/renderer failures.
- Final wide/narrow screenshots reviewed. PE headers confirm CFG, high-entropy
  ASLR, dynamic base and NX. CET is requested, not verified as hardware-enforced.

Final checker attempt: `check-7fdaabf82b7d4cdabf29799710fda355`.
Retained evidence and exact source/published-folder hashes:
`validation/2026-11-02/`. The EXE hash alone is insufficient: this app also loads
its adjacent Hermes bundle, DLLs, icons and Windows App SDK resources.

## Findings and corrected failures

Earlier attempts are retained locally in `.cache/check-*`, separate from acceptance.
They exposed modifier-key selection timing in the native filter, a real queued-tick
Stop race, and stale `useWindowDimensions` values after native resize. The checker
now separates modifier packets; application cancellation clears the interval
synchronously, invalidates queued generation-tagged updates and publishes the
active/stopped accessibility hint. Responsive layout follows root-view `onLayout`
width, and the title may shrink within its row. All were rechecked by the final
full interaction run. Standard native row components are keyed and memoized.

Build integration also needed the installed SDK target, app-local runtime staging,
a valid solution context and UTF-8 JSON without a BOM. A bundler failure could
otherwise reach the template's stale-bundle Hermes compilation; the local strict
MakeBundle target now fails closed. These are implementation/build fixes, not
comparative performance improvements claimed from timing data.

## Remaining gates

This release's Fabric text path selects DirectWrite's system font collection.
The candidate explicitly uses **Segoe UI**, not local Inter/Noto. Local Lucide
PNGs derive from the same SVG geometry. Disclose or normalize these font/asset
and native-control differences before benchmarking against the web reference.
All 10k row views are mounted, but native text/composition/accessibility semantics
are not DOM semantics. Requested rates are not achieved FPS.

Clean Windows deployment, spoken Narrator/NVDA output, real IME composition,
live OS high contrast and the physical scale/multi-monitor DPI matrix remain open
and were explicitly deferred by the user. UIA/200%-scale screenshots do not close
those gates. Distribution/licence review, signing and independent security review
are separate work. No Go CLI, cryptography, persistent user history or updater is
implemented by this example.
